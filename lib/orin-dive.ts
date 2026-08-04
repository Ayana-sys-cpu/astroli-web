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
  /** Two tappable doors into different rooms of the topic — the student steers. */
  | { type: 'choices'; options: string[] }
  /** A few punchy facts, rendered as bullets inside the stream. */
  | { type: 'list'; title?: string; items: string[] }
  /** A small comparison, rendered as a table inside the stream. */
  | { type: 'table'; title?: string; headers: string[]; rows: string[][] }
  | {
      type: 'media';
      kind: 'image' | 'video';
      url: string;
      /** Google-hosted thumbnail — the on-error fallback when a site blocks hotlinking. */
      thumb?: string;
      /** The page the image came from — shown as a tappable source link. */
      pageUrl?: string;
      title: string;
      credit: string;
      source: 'feed' | 'wikimedia';
    };

export interface DiveTurn {
  role: 'student' | 'orin';
  segments: Segment[];
}

/**
 * One reply = one message, optionally with one thing attached. Enforced here
 * rather than asked for in the prompt: a stack of bubbles is the single
 * complaint students and reviewers make about a chat that talks too much.
 */
const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    text: { type: 'string', maxLength: 450 },
    // No array/length constraints anywhere here — structured outputs reject
    // them (maxItems 400s the whole request). The prompt bounds sizes and
    // resolveReply slices defensively.
    choices: { type: 'array', items: { type: 'string' } },
    list: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        title: { type: 'string' },
        items: { type: 'array', items: { type: 'string' } },
      },
    },
    table: {
      type: 'object',
      additionalProperties: false,
      required: ['headers', 'rows'],
      properties: {
        title: { type: 'string' },
        headers: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
      },
    },
    attachment: {
      anyOf: [
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
} as const;

const SYSTEM = `You are Orin, the explorer guide in Astroli — a space-themed learning world for students aged roughly 11 to 16.

Voice: warm, curious, a little awestruck by how the universe works. You talk like a brilliant friend who just found something amazing, never like a textbook or a teacher grading them. Short sentences. Real enthusiasm. Never condescending.

You are exploring ONE topic with the student. Stay on it. If they ask about something unrelated to learning — personal questions about themselves or others, anything unsafe, anything off-topic — steer warmly back to the topic in one line and keep exploring.

Every reply is one short message, optionally with one thing attached:
- "text": this is you talking. ONE short paragraph, 60 words at the very most — a student is reading on a phone and long messages get skimmed. Reveal one thing per reply, never two; save the rest for after their next answer. Plain words only: no markdown, no asterisks, no bullet lists — structure goes in "list" and "table", never in text.
- "list" (optional): 3-5 punchy facts when the answer is naturally several quick things (a timeline, what-they-learned, surprising numbers). Each item under 12 words.
- "table" (optional): a small comparison when two or three things are being weighed against each other (before/after, this-place vs that-place). 2-3 columns, 2-4 rows, cells a few words each. Never use a table for what a sentence can say.
- "choices": exactly TWO directions for where the dive could go next, each starting with a verb ("See how the kids taught each other", "Examine the criticism it drew"), each under 8 words. They are doors into different rooms of the topic — never quiz answers, never a fixed path, and never a question back at the student; typing their own question is always the main way in.
- "attachment" (optional, at most one):
  - "visual": a self-contained interactive explainer as a complete HTML document. Use it when seeing the thing beats reading about it — a labelled cross-section, a simple simulation the student can drag, a chart that makes a comparison obvious.
  - "media_request": ask for a real photograph or diagram from Wikimedia Commons by giving a short search phrase. Describe the SCENE or THING, never just a person's name — "children using computer kiosk in wall Delhi" beats "Sugata Mitra", because a photo of the event tells the story and a headshot tells nothing. Use when a real image of the actual thing helps.

Rules for "visual" HTML:
- One complete <html> document with all CSS and JS inline. No external scripts, stylesheets, fonts, or images — they will not load.
- Dark background (#0A0A0F), white text, system sans-serif font. Accents: teal #00F5D4, magenta #FF3D9A, purple #A855F7, green #00FF88.
- Must fit and look right in a box about 600 by 340 pixels. No scrolling.
- Make it genuinely interactive when the concept allows: sliders, clickable parts, an animation.
- Every control starts at a sensible value and every number on screen is valid from the first paint. Never let "NaN", "undefined" or an empty readout appear.

Never dump everything you know at once — you are having a conversation, not giving a lecture. Say one interesting thing, then end with a question that pulls them deeper and let them choose where to go.

This is free exploration, not a lesson: the student sets the direction, you make every direction tempting. Deliver the payoff of their last question fully, then leave threads dangling — a person unnamed, a consequence unmentioned — and offer choices that pull on different threads. Don't march them down a fixed path of your questions; after the opening, questions from you are occasional spice, not the default ending.

Pick the SHAPE of each reply to fit what it carries, like a great explainer does:
- a story or single fact → just text
- several quick facts or a sequence → text + "list"
- two or three things compared → text + "table"
- a real place, person, object or event → text + "media_request" (the photo does half the telling)
- a concept that only clicks when you play with it → text + "visual"
Most replies carry text plus at most ONE other shape. Never force structure onto an answer that doesn't need it.

When you attach something, your text must hand it to them in the same breath — say what it is and what to do with it ("that's a strand of DNA on the right — click each letter"). Never leave something on screen the student has to guess the purpose of.

If a source card is given below, it is the piece the student just read and tapped on. Use its real names, people and facts — never talk around a person whose name you have been given, and never describe them as "this real person". Do not recite the card back to them; start from it and go further.`;

/**
 * The first message lays the topic on the table like Gemini does: what it is,
 * why it mattered, a real photo, and two doors into the topic — the student
 * decides where the dive goes from there.
 */
const OPENING = `This is the very first message of the dive. The student has just arrived and nothing is on screen yet. Special rules for this message only:

- Two short paragraphs, about 60 words total. First paragraph: what this actually is — real names, dates and places up front, stated with confidence. Second paragraph: why it mattered — what it changed, started or proved.
- No greeting, no "let's explore", no question at the end. You are laying the topic on the table; the student decides where to go.
- Always attach a "media_request" for a real photograph of the actual scene, thing or place — not a portrait of a person. Only use a "visual" if no real photo could exist.
- "choices": exactly TWO directions to take the dive next, each starting with a verb ("See how it was set up", "Explore what critics said"), each under 8 words. They are doors, not answers.`;

const client = new Anthropic();

interface WikimediaHit {
  url: string;
  /** Reliable small fallback (Google-hosted) for sources that block hotlinking. */
  thumb?: string;
  /** The page the image belongs to, when the source exposes one. */
  pageUrl?: string;
  title: string;
  credit: string;
}

/**
 * Google Programmable Search, licence-filtered to Creative Commons / public
 * domain and SafeSearch-locked — the same image engine behind Gemini's answers,
 * minus anything we couldn't legally show a classroom. Google only ever sees
 * the search phrase, never the student. Returns [] when the env keys are
 * absent so the Wikimedia fallback quietly carries the feature.
 */
async function searchGoogleImages(query: string): Promise<WikimediaHit[]> {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return [];

  const params = new URLSearchParams({
    key,
    cx,
    q: query,
    searchType: 'image',
    num: '8',
    safe: 'active',
    rights: 'cc_publicdomain,cc_attribute,cc_sharealike',
    imgSize: 'large',
  });

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const items = (data?.items ?? []) as Array<{
      link?: string;
      title?: string;
      displayLink?: string;
    }>;

    return items.flatMap((item) =>
      item.link
        ? [{
            url: item.link,
            title: (item.title ?? '').slice(0, 120),
            credit: `${item.displayLink ?? 'source'} · Creative Commons`,
          }]
        : [],
    );
  } catch {
    return [];
  }
}

/**
 * Curated real media, free and attributed. Wikimedia only ever sees the search
 * phrase — never the student's identity or their conversation. Returns several
 * candidates so the caller can pick the one that actually shows the story,
 * rather than trusting Wikimedia's first hit (often a conference headshot).
 */
export async function searchWikimedia(query: string): Promise<WikimediaHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: '8',
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
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return [];

    type Page = {
      index?: number;
      title?: string;
      imageinfo?: Array<{
        thumburl?: string;
        url?: string;
        extmetadata?: Record<string, { value?: string }>;
      }>;
    };

    return (Object.values(pages) as Page[])
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .flatMap((page) => {
        const info = page?.imageinfo?.[0];
        const url = info?.thumburl ?? info?.url;
        if (!url) return [];

        const meta = info?.extmetadata ?? {};
        const artist = stripHtml(meta.Artist?.value ?? '') || 'Wikimedia Commons';
        const licence = stripHtml(meta.LicenseShortName?.value ?? '') || 'see Wikimedia Commons';

        return [{
          url,
          title: (page.title ?? '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''),
          credit: `${artist} · ${licence} · Wikimedia Commons`,
        }];
      });
  } catch {
    return [];
  }
}

/**
 * Google Images via Serper, unfiltered by licence — founder's decision
 * (2026-08-03) accepting copyright exposure to match the Gemini experience.
 * SafeSearch stays on. Dormant until SERPER_API_KEY is set; when the free
 * credits run out Serper errors and the CC fallback chain takes over, so the
 * feature degrades instead of billing. Only the search phrase is sent.
 */
async function searchSerperImages(query: string): Promise<WikimediaHit[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 8, safe: 'active' }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const images = (data?.images ?? []) as Array<{
      imageUrl?: string;
      thumbnailUrl?: string;
      title?: string;
      source?: string;
      link?: string;
    }>;

    return images.flatMap((img) =>
      img.imageUrl
        ? [{
            url: img.imageUrl,
            thumb: img.thumbnailUrl,
            pageUrl: img.link,
            title: (img.title ?? '').slice(0, 120),
            credit: `${img.source || (img.link ? new URL(img.link).hostname : 'web')} · via Google Images`,
          }]
        : [],
    );
  } catch {
    return [];
  }
}

/**
 * Openverse — the Creative-Commons image aggregator (Flickr, museums, archives;
 * ~700M openly licensed images). Free, keyless, licence-filtered to
 * commercial-use CC, mature content excluded. Only the search phrase is sent.
 */
async function searchOpenverse(query: string): Promise<WikimediaHit[]> {
  const params = new URLSearchParams({
    q: query,
    license_type: 'commercial',
    mature: 'false',
    page_size: '8',
  });

  try {
    const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
      headers: { 'User-Agent': 'Astroli/1.0 (education; contact via astroli.app)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = (data?.results ?? []) as Array<{
      url?: string;
      title?: string;
      creator?: string;
      license?: string;
      source?: string;
    }>;

    return results.flatMap((r) =>
      r.url
        ? [{
            url: r.url,
            title: (r.title ?? '').slice(0, 120),
            credit: `${r.creator || r.source || 'Unknown'} · ${(r.license ?? 'CC').toUpperCase()} · via Openverse`,
          }]
        : [],
    );
  } catch {
    return [];
  }
}

/**
 * Google first if configured; otherwise Openverse and Wikimedia are searched
 * together and their candidates pooled, so the picker chooses from the widest
 * set — Openverse matches strictly and often returns few hits on story-like
 * phrases, while Wikimedia matches loosely but skews to portraits.
 */
async function searchImages(query: string): Promise<WikimediaHit[]> {
  // Real Google Images first (founder-approved, unfiltered) …
  const serper = await searchSerperImages(query);
  if (serper.length > 0) return serper;
  // … then the licence-filtered Google engine if ever configured …
  const google = await searchGoogleImages(query);
  if (google.length > 0) return google;
  // … and the free CC pool as the floor that never runs out.
  const [openverse, wikimedia] = await Promise.all([
    searchOpenverse(query),
    searchWikimedia(query),
  ]);
  return [...openverse, ...wikimedia].slice(0, 10);
}

/**
 * Asks a small fast model which candidate best shows the scene the reply is
 * about — a photo of the event beats a portrait of the person every time.
 * Falls back to the top search result if the pick fails; never blocks a reply.
 */
async function pickBestImage(candidates: WikimediaHit[], context: string): Promise<WikimediaHit> {
  if (candidates.length === 1) return candidates[0];
  try {
    const list = candidates.map((c, i) => `${i}. ${c.title}`).join('\n');
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8,
      system:
        'You pick the best illustration for a message shown to a teenage student. Prefer a photo of the actual scene, event, place or object over a portrait, logo, map or document. Reply with the number of the best option and nothing else.',
      messages: [{ role: 'user', content: `Message: ${context}\n\nImage titles:\n${list}` }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const index = block && block.type === 'text' ? parseInt(block.text.trim(), 10) : NaN;
    if (Number.isInteger(index) && index >= 0 && index < candidates.length) {
      return candidates[index];
    }
  } catch {
    // fall through to the top search result
  }
  return candidates[0];
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim().slice(0, 120);
}

/** The edit a dive started from — the story the student actually read. */
export interface SourceEdit {
  hook: string;
  body: string;
  bridge: string;
}

interface AskOrinOptions {
  topic: string;
  history: DiveTurn[];
  /** The edit's own media, offered as the opening visual when a dive starts from a save. */
  editMedia?: { url: string; kind: 'image' | 'video'; credit: string; title: string } | null;
  /** Present for edit dives — without it Orin only has the headline to work from. */
  source?: SourceEdit | null;
}

/** Returns Orin's segments, or null when the AI is unreachable (callers show "recharging"). */
export async function askOrin({ topic, history, editMedia, source }: AskOrinOptions): Promise<Segment[] | null> {
  const exchanges = history.filter((t) => t.role === 'student').length;
  const wrapUp =
    exchanges >= SOFT_EXCHANGE_CAP
      ? '\n\nThis exploration has run long. Bring it to a satisfying close in this reply and invite them to save it or start a new dive.'
      : '';

  const sourceCard = source
    ? `\n\nSource card the student just read:\nHeadline: ${source.hook}\n${source.body}\n${source.bridge}`
    : '';

  const isOpening = history.length === 0;
  const opening = isOpening ? `\n\n${OPENING}` : '';

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
      system: `${SYSTEM}\n\nTopic: ${topic}${sourceCard}${opening}${wrapUp}`,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: REPLY_SCHEMA },
      },
      messages,
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return null;

    const parsed = JSON.parse(block.text) as { text?: unknown; choices?: unknown; list?: unknown; table?: unknown; attachment?: unknown };
    const segments = await resolveReply(parsed, editMedia);

    // An opening that lands with an empty canvas is the thing this is all
    // guarding against, so fall back to the topic itself if the search missed.
    if (isOpening && !segments.some((s) => s.type === 'media' || s.type === 'visual')) {
      const hits = await searchImages(topic);
      if (hits.length > 0) {
        const hit = await pickBestImage(hits, topic);
        segments.push({
          type: 'media',
          kind: 'image',
          url: hit.url,
          thumb: hit.thumb,
          pageUrl: hit.pageUrl,
          title: hit.title,
          credit: hit.credit,
          source: 'wikimedia',
        });
      }
    }

    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}

/** Turns one model reply into stored segments, fetching any attached media. */
async function resolveReply(
  reply: { text?: unknown; choices?: unknown; list?: unknown; table?: unknown; attachment?: unknown },
  editMedia: AskOrinOptions['editMedia'],
): Promise<Segment[]> {
  const out: Segment[] = [];

  if (typeof reply.text === 'string' && reply.text.trim()) {
    out.push({ type: 'text', text: reply.text });
  }

  const list = reply.list as { title?: unknown; items?: unknown } | undefined;
  if (list && Array.isArray(list.items)) {
    const items = list.items.filter((i): i is string => typeof i === 'string' && i.trim().length > 0);
    if (items.length >= 2) {
      out.push({
        type: 'list',
        title: typeof list.title === 'string' ? list.title : undefined,
        items: items.slice(0, 6),
      });
    }
  }

  const table = reply.table as { title?: unknown; headers?: unknown; rows?: unknown } | undefined;
  if (table && Array.isArray(table.headers) && Array.isArray(table.rows)) {
    const headers = table.headers.filter((h): h is string => typeof h === 'string').slice(0, 3);
    const rows = table.rows
      .filter((r): r is string[] => Array.isArray(r) && r.every((c) => typeof c === 'string'))
      .map((r) => r.slice(0, headers.length))
      .slice(0, 5);
    if (headers.length >= 2 && rows.length >= 1) {
      out.push({
        type: 'table',
        title: typeof table.title === 'string' ? table.title : undefined,
        headers,
        rows,
      });
    }
  }

  const options = Array.isArray(reply.choices)
    ? reply.choices.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  if (options.length >= 2) {
    out.push({ type: 'choices', options: options.slice(0, 3) });
  }

  const attachment = reply.attachment as Record<string, unknown> | undefined;
  if (!attachment || typeof attachment !== 'object') return out;

  if (attachment.type === 'visual' && typeof attachment.html === 'string' && typeof attachment.title === 'string') {
    out.push({ type: 'visual', title: attachment.title, html: attachment.html });
    return out;
  }

  if (attachment.type === 'media_request' && typeof attachment.search === 'string') {
    // The edit's own picture is better than any search result, and free.
    if (editMedia) {
      out.push({
        type: 'media',
        kind: editMedia.kind,
        url: editMedia.url,
        title: editMedia.title,
        credit: editMedia.credit,
        source: 'feed',
      });
      return out;
    }
    const hits = await searchImages(attachment.search);
    if (hits.length > 0) {
      const context = typeof reply.text === 'string' ? reply.text : attachment.search;
      const hit = await pickBestImage(hits, context);
      out.push({ type: 'media', kind: 'image', url: hit.url, thumb: hit.thumb, pageUrl: hit.pageUrl, title: hit.title, credit: hit.credit, source: 'wikimedia' });
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
      if (s.type === 'choices') return `[offered choices: ${s.options.join(' | ')}]`;
      if (s.type === 'list') return `[showed a list${s.title ? `: ${s.title}` : ''} — ${s.items.join('; ')}]`;
      if (s.type === 'table') return `[showed a table${s.title ? `: ${s.title}` : ''} — ${s.headers.join(' / ')}]`;
      return `[showed ${s.kind}: ${s.title}]`;
    })
    .join('\n\n');
}
