// =============================================================================
// scripts/backfill-content.ts
//
// One-time backfill: populates the new content columns on all existing
// missions and plants rows in Supabase.
//
// Run AFTER adding the DB columns in Supabase dashboard.
//
// Usage (from src/astroli-web directory):
//   pnpm dlx tsx scripts/backfill-content.ts
//
// Reads credentials automatically from .env.local — no env vars needed.
// =============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// ── Load .env.local automatically ─────────────────────────────────────────────
try {
  const envPath = join(process.cwd(), '.env.local');
  const lines   = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let   val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    if (val.length >= 2 &&
        ((val.startsWith('"') && val.endsWith('"')) ||
         (val.startsWith("'") && val.endsWith("'")))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — fall back to environment variables already set
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('    Make sure you run this from the src/astroli-web directory (where .env.local lives).');
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;

const headers = {
  apikey:          SERVICE_KEY,
  Authorization:   `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  Prefer:          'return=minimal',
};

// ── Pip-guide metadata (same as in app/api/teacher/connect/route.ts) ─────────

const PLANET_META: Record<string, { icon: string; hint: string }> = {
  Church:     { icon: '⛪', hint: 'Spiritual power & excommunication' },
  Canossa:    { icon: '🏰', hint: 'The humiliation at the castle gates' },
  Ashkenaz:   { icon: '✡',  hint: 'Jewish self-governance in exile' },
  Babylonia:  { icon: '📜', hint: 'Law across borders, without power' },
  Rome:       { icon: '🏛', hint: 'The collapse that made feudalism' },
  Hierarchy:  { icon: '👑', hint: 'Oaths, lords, and vassals' },
  Orders:     { icon: '⚔️', hint: 'Those who pray, fight, and work' },
  Serfdom:    { icon: '🌾', hint: 'Life bound to the manor' },
  Cities:     { icon: '🏙', hint: 'Guilds, universities, and freedom' },
  Toleration: { icon: '✝',  hint: 'Official tolerance vs. mob violence' },
  Islam:      { icon: '☽',  hint: 'The faith and the People of the Book' },
  Jihad:      { icon: '⚔️', hint: 'The theology of struggle' },
  Dhimmi:     { icon: '📖', hint: 'Protected but subordinate' },
  Baghdad:    { icon: '✨', hint: 'The golden age of Islamic scholarship' },
  Crusades:   { icon: '🗡',  hint: 'Rhineland massacres to Jerusalem' },
  Jerusalem:  { icon: '🕍', hint: '200 years of complicated coexistence' },
};

const CHAPTER_LABELS: Record<number, string> = {
  1: 'Medieval History · Ch.1',
  2: 'Medieval History · Ch.2',
  3: 'Medieval History · Ch.3',
};

const OPENING_MESSAGE_2: Record<number, string> = {
  1: 'Before you weigh in, do you want context on the world they lived in?',
  2: 'Before you dive in, want a quick read on the world these people were living in?',
  3: 'Before you explore, do you want context on the world that made these events possible?',
};

const WORLD_BRIEF_SUMMARY: Record<number, string> = {
  1: 'Two leaders, one claim of divine authority…',
  2: 'A world built on sworn oaths and sacred duty…',
  3: 'Three faiths, one holy land, centuries of entanglement…',
};

const WORLD_BRIEF_ITEMS: Record<number, object[]> = {
  1: [
    { title: 'THE OFFICIAL TRUTH',     body: 'In the Middle Ages, <strong>"truth" was not a personal opinion</strong> — it was an official position, guarded and declared by powerful institutions, not individuals.' },
    { title: 'TWO COMPETING CLAIMS',   body: '<strong>The Church</strong> controlled spiritual legitimacy — your soul, your afterlife. <strong>The Emperor</strong> controlled armies and land. Both needed the other to survive.' },
    { title: 'THE REAL QUESTION',      body: 'When two institutions <strong>both claim divine authority</strong>, who can actually enforce it? And what happens to everyone caught in between?' },
  ],
  2: [
    { title: 'THE FEUDAL BARGAIN',     body: 'In a world without police or standing armies, <strong>protection cost everything</strong> — your freedom, your land, your loyalty. The feudal system was a contract written in survival.' },
    { title: 'THREE ORDERS, ONE TRUTH',body: "<strong>Those who pray, those who fight, those who work</strong> — medieval society divided humanity into sacred roles. To question your order was to question God's design." },
    { title: 'THE CRACK IN THE SYSTEM',body: 'When cities began offering <strong>a different kind of security</strong> — through guilds, markets, and community — the feudal bargain started to come apart at the seams.' },
  ],
  3: [
    { title: 'A WORLD OF BOUNDARIES',   body: 'In the medieval Islamic world, <strong>faith determined your legal status</strong> — not your nationality. The Dhimmi system offered protection at the price of permanent second-class standing.' },
    { title: 'THE GOLDEN AGE',           body: '<strong>Algebra, medicine, and preserved philosophy</strong> flowed out of Baghdad while Europe was rebuilding from Roman collapse. The "clash of civilisations" story hides how much they built together.' },
    { title: 'WHEN BELIEF BECOMES VIOLENCE', body: 'The Crusades reveal an uncomfortable truth: <strong>sincere religious conviction and mass atrocity can coexist</strong>. The Rhineland massacres happened before the Crusaders reached Jerusalem.' },
  ],
};

const QA_ANSWERS: Record<number, string[]> = {
  1: [
    "The Pope's real power was the threat of excommunication — being cut off from heaven itself. In a world where almost everyone believed that was real, no army could match that leverage.",
    "Good instinct. The Emperor had soldiers, but soldiers couldn't fight what people believed. When Gregory excommunicated Henry IV, his own nobles abandoned him — because their oaths were suddenly invalidated by God's representative.",
    "Think of it this way: this wasn't really a fight about soldiers or land. It was about who got to define what was true and legitimate. In a deeply religious world, that question cut to the core of everything.",
  ],
  2: [
    "The feudal bargain made sense precisely because the danger was real — Viking raids, no police, no army to call. People genuinely needed someone with walls and weapons. The question your mission asks is whether the price they paid was fair.",
    "Exactly — the Three Orders ideology was essentially a religious justification for the status quo. If God designed your position in society, questioning it becomes not just rebellious but sinful. That's powerful social control.",
    "Cities cracked the feudal model open. They offered a different kind of security — through guilds and community — without demanding total surrender of freedom. But they came with their own trade-offs worth exploring.",
  ],
  3: [
    "The Dhimmi system is worth sitting with. Jewish communities were genuinely protected under Islamic rule — often better than under Christian rulers. But that protection came with explicit subordination. Both things are true at once.",
    "The Crusades reveal something uncomfortable: sincere religious belief and moral atrocity can coexist. The Rhineland massacres happened before the Crusaders even reached Jerusalem — by people who genuinely thought they were doing God's work.",
    "The Golden Age of Baghdad gets left out of most Western history stories. But algebra, advanced medicine, and preserved Aristotle all came through Islamic scholars. The 'clash of civilisations' narrative hides how much they built together.",
  ],
};

const MISSION_QA_ANSWERS: Record<number, string[]> = {
  1: [
    "The project asks you to act as a mediator — your job isn't to pick a winner, but to show why both sides genuinely believed they were right. The strongest arguments acknowledge what each side was actually protecting.",
    "You'll be building a written argument, so focus on collecting specific quotes and evidence as you explore each planet. Save anything that explains *why* someone acted the way they did — motive is everything in this mission.",
    "Don't worry about covering every planet — pick the ones that feel most relevant to the question and go deep. Two or three well-explored planets will give you more to work with than a rushed visit to all of them.",
  ],
  2: [
    "Your project asks whether the feudal bargain was fair — not just whether it worked. You're not looking for a verdict, you're building a case that shows the trade-offs clearly from multiple perspectives.",
    "The strongest arguments will acknowledge that people at the time didn't experience this as oppression — they experienced it as order, safety, and God's plan. Understanding *their* logic is what makes your argument compelling.",
    "Concentrate on the planets that show contrast — serfdom vs. cities, for example. That tension is where your most interesting evidence will come from.",
  ],
  3: [
    "This mission asks you to hold complexity without resolving it too quickly. Protection and subordination coexisted. Religious conviction and violence coexisted. Your project is about showing *how*, not just *whether*.",
    "The best evidence will come from the moments of contact — where the three faiths actually interacted, traded, debated, or clashed. Focus less on doctrine, more on what people actually did to each other.",
    "You don't need to take a side. The most powerful arguments in this mission will be ones that resist the easy 'clash of civilisations' story and show the full, messy picture instead.",
  ],
};

// ── REST helpers ──────────────────────────────────────────────────────────────

async function patch(table: string, filter: string, body: object): Promise<void> {
  const res = await fetch(`${REST}/${table}?${filter}`, {
    method:  'PATCH',
    headers,
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PATCH ${table} (${filter}) failed ${res.status}: ${text}`);
  }
}

async function get<T>(table: string, filter: string): Promise<T[]> {
  const res = await fetch(`${REST}/${table}?${filter}&select=*`, { headers: { ...headers, Prefer: '' } });
  if (!res.ok) throw new Error(`GET ${table} failed ${res.status}`);
  return res.json() as Promise<T[]>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting content backfill…');

  // ── 1. Backfill missions ─────────────────────────────────────────────────────
  const missions = await get<{ id: string; mission_order: number }>('missions', 'select=id,mission_order');
  console.log(`   Found ${missions.length} mission rows`);

  let missionOk = 0;
  let missionErr = 0;
  for (const m of missions) {
    const order = m.mission_order;
    if (!(order in CHAPTER_LABELS)) {
      console.warn(`   ⚠ Skipping mission ${m.id} — order ${order} not in seed data`);
      continue;
    }
    const q = await getMissionQuestion(m.id);
    const missionBrief = q && q.length > 60 ? q.slice(0, 57) + '…' : (q ?? '');
    try {
      await patch('missions', `id=eq.${m.id}`, {
        chapter:             CHAPTER_LABELS[order],
        mission_brief:       missionBrief,
        opening_message_2:   OPENING_MESSAGE_2[order],
        world_brief_summary: WORLD_BRIEF_SUMMARY[order],
        world_brief_items:   WORLD_BRIEF_ITEMS[order],
        qa_answers:          QA_ANSWERS[order],
        mission_qa_answers:  MISSION_QA_ANSWERS[order],
      });
      missionOk++;
    } catch (err) {
      console.error(`   ✗ Mission ${m.id}:`, err);
      missionErr++;
    }
  }
  console.log(`   Missions: ${missionOk} updated, ${missionErr} errors`);

  // ── 2. Backfill plants ───────────────────────────────────────────────────────
  const plants = await get<{ id: string; label: string }>('plants', 'select=id,label');
  console.log(`   Found ${plants.length} plant rows`);

  let plantOk = 0;
  let plantErr = 0;
  for (const p of plants) {
    const meta = PLANET_META[p.label];
    if (!meta) {
      console.warn(`   ⚠ Skipping plant ${p.id} — label "${p.label}" not in PLANET_META`);
      continue;
    }
    try {
      await patch('plants', `id=eq.${p.id}`, { icon: meta.icon, hint: meta.hint });
      plantOk++;
    } catch (err) {
      console.error(`   ✗ Plant ${p.id} (${p.label}):`, err);
      plantErr++;
    }
  }
  console.log(`   Plants: ${plantOk} updated, ${plantErr} errors`);

  console.log('✅ Backfill complete.');
}

// Helper to fetch the question for a mission (needed to compute mission_brief)
async function getMissionQuestion(id: string): Promise<string | null> {
  const rows = await get<{ question: string }>('missions', `id=eq.${id}&select=question`);
  return rows[0]?.question ?? null;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
