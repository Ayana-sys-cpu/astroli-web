/**
 * Orin's deep-dive brain for Master.
 *
 * A dive turn is a short conversational reply made of typed segments: text,
 * a self-contained interactive visual, or a piece of curated real media.
 * Orin never invents media — visuals are authored here as sandboxed HTML and
 * media comes from the edit's own cover or Wikimedia Commons, always with
 * attribution. No AI image or video generation (cost + safety for minors).
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-5';
/** Keeps a dive focused and bounds cost; Orin starts wrapping up past this. */
export const SOFT_EXCHANGE_CAP = 20;

export type Segment =
  | { type: 'text'; text: string }
  | { type: 'visual'; title: string; html: string }
  | {
      type: 'media';
      kind: 'image' | 'video';
      url: string;
      title: string;
      credit: string;
      source: 'feed' | 'wikimedia';
    };

export interface DiveTurn {
  role: 'student' | 'orin';
  segments: Segment[];
}

const SEGMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['segments'],
  properties: {
    segments: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'text'],
            properties: {
              type: { type: 'string', enum: ['text'] },
              text: { type: 'string' },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'title', 'html'],
            properties: {
              type: { type: 'string', enum: ['visual'] },
              title: { type: 'string' },
              html: { type: 'string' },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'search'],
            properties: {
              type: { type: 'string', enum: ['media_request'] },
              search: { type: 'string' },
            },
          },
        ],
      },
    },
  },
} as const;

const SYSTEM = `You are Orin, the explorer guide in Astroli — a space-themed learning world for students aged roughly 11 to 16.

Voice: warm, curious, a little awestruck by how the universe works. You talk like a brilliant friend who just found something amazing, never like a textbook or a teacher grading them. Short sentences. Real enthusiasm. Never condescending.

You are exploring ONE topic with the student. Stay on it. If they ask about something unrelated to learning — personal questions about themselves or others, anything unsafe, anything off-topic — steer warmly back to the topic in one line and keep exploring.

Every reply is a list of segments:
- "text": one or two short conversational paragraphs. This is you talking. Always include at least one.
- "visual": a self-contained interactive explainer as a complete HTML document. Use it when seeing the thing beats reading about it — a labelled cross-section, a simple simulation the student can drag, a chart that makes a comparison obvious.
- "media_request": ask for a real photograph or diagram from Wikimedia Commons by giving a short search phrase (e.g. "erupting volcano lava"). Use when a real image of the actual thing helps.

Rules for "visual" HTML:
- One complete <html> document with all CSS and JS inline. No external scripts, stylesheets, fonts, or images — they will not load.
- Dark background (#0A0A0F), white text, system sans-serif font. Accents: teal #00F5D4, magenta #FF3D9A, purple #A855F7, green #00FF88.
- Must fit and look right in a box about 600 by 340 pixels. No scrolling.
- Make it genuinely interactive when the concept allows: sliders, clickable parts, an animation.

Keep replies short — a student is reading on a phone. One visual or one media_request per reply at most, and only when it truly helps. End most replies with a question that pulls them deeper.`;

const client = new Anthropic();

interface WikimediaHit {
  url: string;
  title: string;
  credit: string;
}

/**
 * Curated real media, free and attributed. Wikimedia only ever sees the search
 * phrase — never the student's identity or their conversation.
 */
export async function searchWikimedia(query: string): Promise<WikimediaHit | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: '1',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '900',
    origin: '*',
  });

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'Astroli/1.0 (education; contact via astroli.app)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as {
      title?: string;
      imageinfo?: Array<{
        thumburl?: string;
        url?: string;
        extmetadata?: Record<string, { value?: string }>;
      }>;
    };
    const info = page?.imageinfo?.[0];
    const url = info?.thumburl ?? info?.url;
    if (!url) return null;

    const meta = info?.extmetadata ?? {};
    const artist = stripHtml(meta.Artist?.value ?? '') || 'Wikimedia Commons';
    const licence = stripHtml(meta.LicenseShortName?.value ?? '') || 'see Wikimedia Commons';

    return {
      url,
      title: (page.title ?? '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''),
      credit: `${artist} · ${licence} · Wikimedia Commons`,
    };
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim().slice(0, 120);
}

interface AskOrinOptions {
  topic: string;
  history: DiveTurn[];
  /** The edit's own media, offered as the opening visual when a dive starts from a save. */
  editMedia?: { url: string; kind: 'image' | 'video'; credit: string; title: string } | null;
}

/** Returns Orin's segments, or null when the AI is unreachable (callers show "recharging"). */
export async function askOrin({ topic, history, editMedia }: AskOrinOptions): Promise<Segment[] | null> {
  const exchanges = history.filter((t) => t.role === 'student').length;
  const wrapUp =
    exchanges >= SOFT_EXCHANGE_CAP
      ? '\n\nThis exploration has run long. Bring it to a satisfying close in this reply and invite them to save it or start a new dive.'
      : '';

  const messages: Anthropic.MessageParam[] = history.length
    ? history.map((turn) => ({
        role: turn.role === 'student' ? ('user' as const) : ('assistant' as const),
        content: segmentsToPrompt(turn.segments),
      }))
    : [{ role: 'user' as const, content: `Let's explore: ${topic}` }];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: `${SYSTEM}\n\nTopic: ${topic}${wrapUp}`,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SEGMENT_SCHEMA },
      },
      messages,
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return null;

    const parsed = JSON.parse(block.text) as { segments?: unknown };
    const segments = await resolveSegments(parsed.segments, editMedia);
    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}

/** Turns the model's raw segment list into stored segments, fetching any requested media. */
async function resolveSegments(
  raw: unknown,
  editMedia: AskOrinOptions['editMedia'],
): Promise<Segment[]> {
  if (!Array.isArray(raw)) return [];
  const out: Segment[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const seg = item as Record<string, unknown>;

    if (seg.type === 'text' && typeof seg.text === 'string' && seg.text.trim()) {
      out.push({ type: 'text', text: seg.text });
    } else if (seg.type === 'visual' && typeof seg.html === 'string' && typeof seg.title === 'string') {
      out.push({ type: 'visual', title: seg.title, html: seg.html });
    } else if (seg.type === 'media_request' && typeof seg.search === 'string') {
      // The edit's own media is better than any search result, and free.
      if (editMedia) {
        out.push({
          type: 'media',
          kind: editMedia.kind,
          url: editMedia.url,
          title: editMedia.title,
          credit: editMedia.credit,
          source: 'feed',
        });
        editMedia = null;
        continue;
      }
      const hit = await searchWikimedia(seg.search);
      if (hit) {
        out.push({
          type: 'media',
          kind: 'image',
          url: hit.url,
          title: hit.title,
          credit: hit.credit,
          source: 'wikimedia',
        });
      }
    }
  }

  return out;
}

/** Flattens stored segments back into prompt text for the next turn. */
function segmentsToPrompt(segments: Segment[]): string {
  return segments
    .map((s) => {
      if (s.type === 'text') return s.text;
      if (s.type === 'visual') return `[showed an interactive visual: ${s.title}]`;
      return `[showed ${s.kind}: ${s.title}]`;
    })
    .join('\n\n');
}
