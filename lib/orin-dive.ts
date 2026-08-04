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
  /** A jaw-dropping stat or "did you know" fact rendered in a spotlight box. */
  | { type: 'callout'; label?: string; text: string }
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
  required: ['text', 'choices'],
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
    callout: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: {
        label: { type: 'string' },
        text: { type: 'string' },
      },
    },
    quiz: {
      type: 'object',
      additionalProperties: false,
      required: ['done'],
      properties: {
        verdict: { type: 'string', enum: ['correct', 'incorrect'] },
        done: { type: 'boolean' },
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
            kind: { type: 'string', enum: ['image', 'video'] },
          },
        },
      ],
    },
  },
} as const;

const SYSTEM = `You are Orin, the explorer guide in Astroli — a space-themed learning world for students aged roughly 11 to 16.

Voice: warm, curious, a little awestruck by how the universe works. You talk like a brilliant friend who just found something amazing, never like a textbook or a teacher grading them. Short sentences. Real enthusiasm. Never condescending.

Write for a 12-13 year old: everyday words, short sentences, active voice. When a technical term has to appear, gloss it in a few plain words right there ("kinetic energy — the energy of moving stuff"). If a sentence would need re-reading, split it.

You may use AT MOST one emoji per message, only when it acts as a visual anchor for the thing itself (🌋 for a volcano, 🛰️ for a satellite) — at the start of the message or a list item, never mid-sentence, never decoration for its own sake. Many messages need none.

You are exploring ONE topic with the student. Stay on it. If they ask about something unrelated to learning — personal questions about themselves or others, anything unsafe, anything off-topic — steer warmly back to the topic in one line and keep exploring.

Every reply is one short message, optionally with one thing attached:
- "text": this is you talking. ONE short paragraph, 60 words at the very most — a student is reading on a phone and long messages get skimmed. Reveal one thing per reply, never two; save the rest for after their next answer. Wrap the 2-4 words a skimming teen must catch — names, numbers, the vivid phrase — in double asterisks like **Sugata Mitra** or **six years old**; they render highlighted. No other markdown, no bullet lists — structure goes in "list" and "table", never in text.
- "list" (optional): 3-5 punchy facts when the answer is naturally several quick things (a timeline, what-they-learned, surprising numbers). Each item under 12 words.
- "table" (optional): a small comparison when two or three things are being weighed against each other (before/after, this-place vs that-place). 2-3 columns, 2-4 rows, cells a few words each. Never use a table for what a sentence can say.
- "callout" (optional): a jaw-dropping stat, record, or "did you know" fact rendered in its own spotlight box — one punchy sentence under 25 words. Use when a number or fact is so striking it deserves its own moment. Never a restatement of the text above; must add something new. "The hole in the ozone layer was larger than Antarctica." "Light takes 8 minutes to reach Earth — we always see the Sun as it was, never now."
- "choices": exactly TWO directions for where the dive could go next, each starting with a verb ("See how the kids taught each other", "Examine the criticism it drew"), each under 8 words. They are doors into different rooms of the topic — never quiz answers, never a fixed path, and never a question back at the student; typing their own question is always the main way in.
- "attachment" (optional, at most one):
  - "visual": a self-contained interactive explainer as a complete HTML document. Use it when seeing the thing beats reading about it — a labelled cross-section, a simple simulation the student can drag, a chart that makes a comparison obvious.
  - "media_request": ask for a real photograph, diagram, or video by giving a short search phrase. Set "kind" to "video" only when motion is essential to understanding (a chemical reaction, a sports technique, a historical speech clip) — default to "image". Describe the SCENE or THING, never just a person's name — "children using computer kiosk in wall Delhi" beats "Sugata Mitra", because a photo of the event tells the story and a headshot tells nothing. Use when a real image of the actual thing helps.

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

- Two short paragraphs, about 60 words total. First paragraph: what this actually is — real names, dates and places up front, stated with confidence. Second paragraph: why it mattered — what it changed, started or proved. Wrap the key names, dates and vivid phrases in double asterisks so they render highlighted.
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
 * YouTube/web video search via Serper. Used when Orin requests kind:"video" —
 * motion topics (chemical reactions, historical speeches, sports technique).
 * Returns the raw video page URL; the MediaCard renders it as a native <video>
 * when the host allows it, otherwise the link falls back to the thumb preview.
 * Dormant until SERPER_API_KEY is set — no key, no video, graceful degradation.
 */
async function searchSerperVideos(query: string): Promise<WikimediaHit[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch('https://google.serper.dev/videos', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 4 }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const videos = (data?.videos ?? []) as Array<{
      link?: string;
      title?: string;
      source?: string;
      thumbnailUrl?: string;
    }>;

    return videos.flatMap((v) =>
      v.link
        ? [{
            url: v.link,
            thumb: v.thumbnailUrl,
            title: (v.title ?? '').slice(0, 120),
            credit: v.source ?? new URL(v.link).hostname,
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

/** The server-side quiz state handed to Orin each quiz turn. */
export interface QuizContext {
  /** Question the student is currently answering (0 = quiz just requested). */
  answered: number;
  correctSoFar: number;
  /** True when this dive already paid out — the quiz runs for glory only. */
  alreadyRewarded: boolean;
}

/** Orin's verdict metadata for a quiz turn, alongside the visible segments. */
export interface QuizResult {
  verdict: 'correct' | 'incorrect' | null;
  done: boolean;
}

export interface OrinReply {
  segments: Segment[];
  quiz: QuizResult | null;
}

interface AskOrinOptions {
  topic: string;
  history: DiveTurn[];
  /** The edit's own media, offered as the opening visual when a dive starts from a save. */
  editMedia?: { url: string; kind: 'image' | 'video'; credit: string; title: string } | null;
  /** Present for edit dives — without it Orin only has the headline to work from. */
  source?: SourceEdit | null;
  /** Set while a quiz is running — switches Orin into quiz mode for this turn. */
  quiz?: QuizContext | null;
}

const QUIZ_QUESTIONS = 3;

function quizInstructions(quiz: QuizContext): string {
  const judging =
    quiz.answered > 0
      ? `The student's latest message answers your question ${quiz.answered}. Judge it honestly in "quiz.verdict" ("correct" for a right or clearly-close answer, "incorrect" otherwise) and open your text by warmly telling them which it was, with the right answer in one line if they missed.`
      : `The student just asked to be quizzed. Set "quiz.verdict" to null.`;
  const next =
    quiz.answered >= QUIZ_QUESTIONS
      ? `That was the last question — set "quiz.done" to true. Your text celebrates their score in one line. Add a "list" titled "What you just learned" with 2-3 bullets recapping this dive. Set "choices" to exactly ["Keep exploring", "Discover something new"].`
      : `Then ask question ${quiz.answered + 1} of ${QUIZ_QUESTIONS} — short, about something actually covered in THIS conversation, answerable in a few words. Set "quiz.done" to false. Put 2-3 short answer options in "choices" (one of them right) so they can answer with a tap.`;
  const glory = quiz.alreadyRewarded
    ? ` This dive already earned its coins — if this is the first question, mention cheerfully that this round is for glory only.`
    : '';
  return `\n\nQUIZ MODE — you are running a quick self-test (${QUIZ_QUESTIONS} questions) on what THIS dive covered. ${judging} ${next}${glory} No new topics, no attachment this turn.`;
}

/** Returns Orin's reply, or null when the AI is unreachable (callers show "recharging"). */
export async function askOrin({ topic, history, editMedia, source, quiz = null }: AskOrinOptions): Promise<OrinReply | null> {
  const exchanges = history.filter((t) => t.role === 'student').length;
  const wrapUp =
    !quiz && exchanges >= SOFT_EXCHANGE_CAP
      ? '\n\nThis exploration has run long. Bring it to a satisfying close in this reply and invite them to save it or start a new dive.'
      : '';
  // A gentle nudge toward the self-test once they're genuinely deep.
  const quizOffer =
    !quiz && exchanges === 8
      ? '\n\nThe student is 8 questions deep and has not tried the quiz. End this reply by warmly offering the "Quiz me" button — proving what they picked up earns coins.'
      : '';

  const sourceCard = source
    ? `\n\nSource card the student just read:\nHeadline: ${source.hook}\n${source.body}\n${source.bridge}`
    : '';

  const isOpening = history.length === 0;
  const opening = isOpening ? `\n\n${OPENING}` : '';
  const quizMode = quiz ? quizInstructions(quiz) : '';
  // During a quiz the verdict field is load-bearing (it drives the coin
  // count), so it stops being optional — the model must emit it every turn.
  const schema = quiz
    ? { ...REPLY_SCHEMA, required: ['text', 'choices', 'quiz'] }
    : REPLY_SCHEMA;

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
      system: `${SYSTEM}\n\nTopic: ${topic}${sourceCard}${opening}${wrapUp}${quizOffer}${quizMode}`,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema },
      },
      messages,
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return null;

    const parsed = JSON.parse(block.text) as {
      text?: unknown; choices?: unknown; list?: unknown; table?: unknown; callout?: unknown; attachment?: unknown;
      quiz?: { verdict?: unknown; done?: unknown };
    };
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

    if (segments.length === 0) return null;

    const quizResult: QuizResult | null = quiz
      ? {
          verdict:
            parsed.quiz?.verdict === 'correct' || parsed.quiz?.verdict === 'incorrect'
              ? parsed.quiz.verdict
              : null,
          done: parsed.quiz?.done === true,
        }
      : null;

    return { segments, quiz: quizResult };
  } catch {
    return null;
  }
}

/** Turns one model reply into stored segments, fetching any attached media. */
async function resolveReply(
  reply: { text?: unknown; choices?: unknown; list?: unknown; table?: unknown; callout?: unknown; attachment?: unknown },
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

  const callout = reply.callout as { label?: unknown; text?: unknown } | undefined;
  if (callout && typeof callout.text === 'string' && callout.text.trim()) {
    out.push({
      type: 'callout',
      label: typeof callout.label === 'string' ? callout.label.slice(0, 40) : undefined,
      text: callout.text.trim().slice(0, 140),
    });
  }

  // Built here, appended last — the two doors always render after everything
  // else in the reply, photo included.
  const options = Array.isArray(reply.choices)
    ? reply.choices.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  const doors: Segment | null =
    options.length >= 2 ? { type: 'choices', options: options.slice(0, 2) } : null;
  const finish = (segments: Segment[]) => {
    if (doors) segments.push(doors);
    return segments;
  };

  const attachment = reply.attachment as Record<string, unknown> | undefined;
  if (!attachment || typeof attachment !== 'object') return finish(out);

  if (attachment.type === 'visual' && typeof attachment.html === 'string' && typeof attachment.title === 'string') {
    out.push({ type: 'visual', title: attachment.title, html: attachment.html });
    return finish(out);
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
      return finish(out);
    }
    if (attachment.kind === 'video') {
      const videos = await searchSerperVideos(attachment.search);
      if (videos.length > 0) {
        const v = videos[0];
        out.push({ type: 'media', kind: 'video', url: v.url, thumb: v.thumb, title: v.title, credit: v.credit, source: 'wikimedia' });
        return finish(out);
      }
      // No video found — fall through to image search rather than leaving the turn bare.
    }
    const hits = await searchImages(attachment.search);
    if (hits.length > 0) {
      const context = typeof reply.text === 'string' ? reply.text : attachment.search;
      const hit = await pickBestImage(hits, context);
      out.push({ type: 'media', kind: 'image', url: hit.url, thumb: hit.thumb, pageUrl: hit.pageUrl, title: hit.title, credit: hit.credit, source: 'wikimedia' });
    }
  }

  return finish(out);
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
      if (s.type === 'callout') return `[callout${s.label ? `: ${s.label}` : ''} — ${s.text}]`;
      return `[showed ${s.kind}: ${s.title}]`;
    })
    .join('\n\n');
}
