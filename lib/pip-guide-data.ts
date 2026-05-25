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

export interface PipMission {
  order:            number;
  question:         string;    // the Big Question
  worldBrief:       string;    // questionDescription — shown in World Brief card
  projectTitle:     string;
  projectObjective: string;    // first paragraph of project_description
  openingMessage:   string;
  missionBrief:     string;    // short label for the header brief bar
  chapter:          string;
  planets:          PipPlanet[];
  qaAnswers:        string[];  // canned Pip answers during Q&A phase
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

// ── Chapter labels ────────────────────────────────────────────────────────────

const CHAPTER_LABELS: Record<number, string> = {
  1: 'Medieval History · Ch.1',
  2: 'Medieval History · Ch.2',
  3: 'Medieval History · Ch.3',
};

// ── Build PIP_MISSIONS from HARDCODED_MISSIONS ────────────────────────────────

export const PIP_MISSIONS: PipMission[] = HARDCODED_MISSIONS.map((m) => {
  // First paragraph of project_description as the mission objective
  const firstPara  = m.project_description.split('\n\n')[0].trim();
  const objective  = firstPara.length > 320 ? firstPara.slice(0, 317) + '…' : firstPara;

  // Short version for the header brief bar
  const missionBrief = m.question.length > 60 ? m.question.slice(0, 57) + '…' : m.question;

  return {
    order:            m.mission_order,
    question:         m.question,
    worldBrief:       m.question_description,
    projectTitle:     m.project_title,
    projectObjective: objective,
    openingMessage:   m.opening_message,
    missionBrief,
    chapter:          CHAPTER_LABELS[m.mission_order] ?? `Ch.${m.mission_order}`,
    planets: m.plants.map((p) => ({
      icon: PLANET_META[p.label]?.icon ?? '🌍',
      name: p.label,
      hint: PLANET_META[p.label]?.hint ?? p.title.slice(0, 45),
    })),
    qaAnswers: QA_ANSWERS[m.mission_order] ?? QA_ANSWERS[1],
  };
});

export function getPipMission(order: number): PipMission {
  return PIP_MISSIONS.find((m) => m.order === order) ?? PIP_MISSIONS[0];
}
