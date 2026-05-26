// =============================================================================
// PIP GUIDE DATA — maps HARDCODED_MISSIONS into the Pip chat UI format
// Used by /pip-guide page (web) and mirrors src/astroli/services/pip-missions.ts (mobile)
// =============================================================================

import { HARDCODED_MISSIONS } from './hardcoded-missions';

export interface PipPlanet {
  icon: string;
  name: string; // = plant label
  hint: string; // short one-line description
}

export interface WorldBriefItem {
  title: string;
  body:  string; // may contain HTML (<strong>, <em>)
}

export interface PipMission {
  order:              number;
  question:           string;           // the Big Question
  worldBrief:         string;           // questionDescription — legacy plain text fallback
  worldBriefSummary:  string;           // one-liner shown in the card header
  worldBriefItems:    WorldBriefItem[]; // colored stripe cards in the expanded brief
  projectTitle:       string;
  projectObjective:   string;           // first paragraph of project_description
  openingMessage:     string;
  openingMessage2:    string;           // second Pip message before the World Brief CTA
  missionBrief:       string;           // short label for the header brief bar
  chapter:            string;
  planets:            PipPlanet[];
  qaAnswers:          string[];         // canned Pip answers during era Q&A phase
  missionQaAnswers:   string[];         // canned Pip answers about the mission/project
}

// ── Planet icon + hint lookup ─────────────────────────────────────────────────

const PLANET_META: Record<string, { icon: string; hint: string }> = {
  'Church':     { icon: '⛪', hint: 'Spiritual power & excommunication' },
  'Canossa':    { icon: '🏰', hint: 'The humiliation at the castle gates' },
  'Ashkenaz':   { icon: '✡',  hint: 'Jewish self-governance in exile' },
  'Babylonia':  { icon: '📜', hint: 'Law across borders, without power' },
  'Rome':       { icon: '🏛', hint: 'The collapse that made feudalism' },
  'Hierarchy':  { icon: '👑', hint: 'Oaths, lords, and vassals' },
  'Orders':     { icon: '⚔️', hint: 'Those who pray, fight, and work' },
  'Serfdom':    { icon: '🌾', hint: 'Life bound to the manor' },
  'Cities':     { icon: '🏙', hint: 'Guilds, universities, and freedom' },
  'Toleration': { icon: '✝',  hint: 'Official tolerance vs. mob violence' },
  'Islam':      { icon: '☽',  hint: 'The faith and the People of the Book' },
  'Jihad':      { icon: '⚔️', hint: 'The theology of struggle' },
  'Dhimmi':     { icon: '📖', hint: 'Protected but subordinate' },
  'Baghdad':    { icon: '✨', hint: 'The golden age of Islamic scholarship' },
  'Crusades':   { icon: '🗡',  hint: 'Rhineland massacres to Jerusalem' },
  'Jerusalem':  { icon: '🕍', hint: '200 years of complicated coexistence' },
};

// ── Canned Q&A answers per mission ────────────────────────────────────────────

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

// ── Canned Q&A answers about the mission/project (after mission card shown) ───

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

// ── Chapter labels ────────────────────────────────────────────────────────────

const CHAPTER_LABELS: Record<number, string> = {
  1: 'Medieval History · Ch.1',
  2: 'Medieval History · Ch.2',
  3: 'Medieval History · Ch.3',
};

// ── Opening message 2 (shown after the first message, before World Brief CTA) ─

const OPENING_MESSAGE_2: Record<number, string> = {
  1: 'Before you weigh in, do you want context on the world they lived in?',
  2: 'Before you dive in, want a quick read on the world these people were living in?',
  3: 'Before you explore, do you want context on the world that made these events possible?',
};

// ── World Brief summaries (shown in the collapsed card header) ────────────────

const WORLD_BRIEF_SUMMARY: Record<number, string> = {
  1: 'Two leaders, one claim of divine authority…',
  2: 'A world built on sworn oaths and sacred duty…',
  3: 'Three faiths, one holy land, centuries of entanglement…',
};

// ── World Brief items (colored stripe cards) ──────────────────────────────────

const WORLD_BRIEF_ITEMS: Record<number, WorldBriefItem[]> = {
  1: [
    {
      title: 'THE OFFICIAL TRUTH',
      body:  'In the Middle Ages, <strong>"truth" was not a personal opinion</strong> — it was an official position, guarded and declared by powerful institutions, not individuals.',
    },
    {
      title: 'TWO COMPETING CLAIMS',
      body:  '<strong>The Church</strong> controlled spiritual legitimacy — your soul, your afterlife. <strong>The Emperor</strong> controlled armies and land. Both needed the other to survive.',
    },
    {
      title: 'THE REAL QUESTION',
      body:  'When two institutions <strong>both claim divine authority</strong>, who can actually enforce it? And what happens to everyone caught in between?',
    },
  ],
  2: [
    {
      title: 'THE FEUDAL BARGAIN',
      body:  'In a world without police or standing armies, <strong>protection cost everything</strong> — your freedom, your land, your loyalty. The feudal system was a contract written in survival.',
    },
    {
      title: 'THREE ORDERS, ONE TRUTH',
      body:  '<strong>Those who pray, those who fight, those who work</strong> — medieval society divided humanity into sacred roles. To question your order was to question God\'s design.',
    },
    {
      title: 'THE CRACK IN THE SYSTEM',
      body:  'When cities began offering <strong>a different kind of security</strong> — through guilds, markets, and community — the feudal bargain started to come apart at the seams.',
    },
  ],
  3: [
    {
      title: 'A WORLD OF BOUNDARIES',
      body:  'In the medieval Islamic world, <strong>faith determined your legal status</strong> — not your nationality. The Dhimmi system offered protection at the price of permanent second-class standing.',
    },
    {
      title: 'THE GOLDEN AGE',
      body:  '<strong>Algebra, medicine, and preserved philosophy</strong> flowed out of Baghdad while Europe was rebuilding from Roman collapse. The "clash of civilisations" story hides how much they built together.',
    },
    {
      title: 'WHEN BELIEF BECOMES VIOLENCE',
      body:  'The Crusades reveal an uncomfortable truth: <strong>sincere religious conviction and mass atrocity can coexist</strong>. The Rhineland massacres happened before the Crusaders reached Jerusalem.',
    },
  ],
};

// ── Build PIP_MISSIONS from HARDCODED_MISSIONS ────────────────────────────────

export const PIP_MISSIONS: PipMission[] = HARDCODED_MISSIONS.map((m) => {
  // First paragraph of project_description as the mission objective
  const firstPara  = m.project_description.split('\n\n')[0].trim();
  const objective  = firstPara.length > 320 ? firstPara.slice(0, 317) + '…' : firstPara;

  // Short version for the header brief bar
  const missionBrief = m.question.length > 60 ? m.question.slice(0, 57) + '…' : m.question;

  return {
    order:             m.mission_order,
    question:          m.question,
    worldBrief:        m.question_description,
    worldBriefSummary: WORLD_BRIEF_SUMMARY[m.mission_order] ?? WORLD_BRIEF_SUMMARY[1],
    worldBriefItems:   WORLD_BRIEF_ITEMS[m.mission_order]   ?? WORLD_BRIEF_ITEMS[1],
    projectTitle:      m.project_title,
    projectObjective:  objective,
    openingMessage:    m.opening_message,
    openingMessage2:   OPENING_MESSAGE_2[m.mission_order]   ?? OPENING_MESSAGE_2[1],
    missionBrief,
    chapter:           CHAPTER_LABELS[m.mission_order] ?? `Ch.${m.mission_order}`,
    planets: m.plants.map((p) => ({
      icon: PLANET_META[p.label]?.icon ?? '🌍',
      name: p.label,
      hint: PLANET_META[p.label]?.hint ?? p.title.slice(0, 45),
    })),
    qaAnswers:        QA_ANSWERS[m.mission_order]         ?? QA_ANSWERS[1],
    missionQaAnswers: MISSION_QA_ANSWERS[m.mission_order] ?? MISSION_QA_ANSWERS[1],
  };
});

export function getPipMission(order: number): PipMission {
  return PIP_MISSIONS.find((m) => m.order === order) ?? PIP_MISSIONS[0];
}
