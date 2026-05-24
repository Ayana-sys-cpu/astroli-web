// Remaining mock data used by mission/, mission/brief, mission/reveal,
// components/TopBar, and components/ConflictOverlay.
// Landscape pages now use real DB data — see lib/plant-meta.ts and lib/planet-experience.ts.

export const MOCK_USER = {
  email: 'ayana6@gmail.com',
  fullName: 'Ayana Reiss',
  firstName: 'Ayana',
  displayName: 'Ayana R.',
};

// Mission 1 display values used by mission/brief and mission/reveal pages.
export const MOCK_MISSION = {
  label: 'MISSION 03',
  bigIdea: 'Who Owns The Truth?',
  bigQuestion: 'Who owns the truth — the establishment or the individual?',
  subtitle: "When the Pope and the Emperor both claim God is on their side — who decides who's right?",
  mission: "The Great Sovereignty Debate — build a council argument defending your assigned side's claim to ultimate authority.",
};

export const MEDIUM_OPTIONS = [
  { id: 'audio',      label: "Founder's Address",  color: '#FF6B35', dot: '●' },
  { id: 'design',     label: 'Visual Blueprint',    color: '#FFD166', dot: '●' },
  { id: 'writing',    label: "Traveler's Guide",    color: '#06D6A0', dot: '●' },
  { id: 'analytical', label: 'Sacred Constitution', color: '#118AB2', dot: '●' },
];

export const CORE_CONFLICTS = [
  {
    id: 'pillars',
    icon: '🏛',
    title: 'Pillars of Order',
    description: 'Leaders & experts give the facts and keep peace.',
  },
  {
    id: 'power',
    icon: '⚡',
    title: 'Power of One',
    description: 'Each citizen finds the truth themselves — even if messy.',
  },
];
