// Static metadata derived from hardcoded planet titles.
// Avoids extra DB columns — titles are stable since all content is hardcoded.
// Used by landscape pages to display one-word planet labels and hover questions.

export interface PlanetMeta {
  label: string;    // one-word display name shown below the planet
  question: string; // hook question shown on hover tooltip
}

export const PLANET_META: Record<string, PlanetMeta> = {
  // Mission 1 — Who Owns The Truth?
  'The Central Role of the Catholic Church in Medieval Society': {
    label: 'Church',
    question: 'What would it actually cost an ordinary person to disagree with an institution that controlled everything?',
  },
  'The Pope vs. The Emperor: The Investiture Controversy': {
    label: 'Canossa',
    question: 'How does someone with that much power end up barefoot in the snow, begging forgiveness from a priest?',
  },
  'The Jewish Community in Ashkenaz: Rabbenu Gershom and Rashi': {
    label: 'Ashkenaz',
    question: "What makes authority real, if it's not backed by force?",
  },
  'The Geonim of Babylonia: Jewish Leadership in Exile': {
    label: 'Babylonia',
    question: 'What made that kind of authority work — with nothing behind it except reputation and trust?',
  },

  // Mission 2 — Is Personal Security Worth The Loss Of Freedom?
  'The Fall of Rome and the Conditions That Created Feudalism': {
    label: 'Rome',
    question: 'What would you be willing to agree to in exchange for safety?',
  },
  'The Feudal Hierarchy: Kings, Nobles, Vassals, and Serfs': {
    label: 'Hierarchy',
    question: 'Where in this web would you actually want to be — and what would you have to give up to get there?',
  },
  'The Three Orders: Those Who Pray, Those Who Fight, Those Who Work': {
    label: 'Orders',
    question: 'Who benefits most from that particular story? Is that a coincidence?',
  },
  'Daily Life in Feudal Society': {
    label: 'Serfdom',
    question: 'Was the Feudal Bargain a fair deal?',
  },
  'The Rise of Cities and Urban Autonomy: Guilds and Universities': {
    label: 'Cities',
    question: 'What did people gain from the urban bargain — and what new things did they give up?',
  },

  // Mission 3 — Must an Encounter Between Cultures Always End in Victory of One Side?
  'Judaism in the Christian Worldview: How the Medieval Church Saw Jews': {
    label: 'Toleration',
    question: 'How can an institution simultaneously protect a group and persecute them?',
  },
  'The Foundations of Islam: Core Beliefs and Connections to Judaism and Christianity': {
    label: 'Islam',
    question: 'Why did sharing so much common theological ground not prevent — and sometimes intensify — conflict?',
  },
  'The Spread of Islam and the Concept of Jihad': {
    label: 'Jihad',
    question: 'What does Jihad actually mean in Islamic theology — not the caricature?',
  },
  'Jews Under Islamic Rule: The Dhimmi System and the Pact of Umar': {
    label: 'Dhimmi',
    question: 'Can a system be both tolerant and discriminatory at the same time?',
  },
  'The Golden Age of Muslim Culture: Science, Philosophy, and Art': {
    label: 'Baghdad',
    question: 'What does it mean that "Western civilisation" was built partly on work done in Baghdad?',
  },
  'The Crusades: Origins, Conflict, and the Jewish Experience': {
    label: 'Crusades',
    question: 'What do we do with the fact that sincere belief has been used to justify both the best and worst things humans have ever done?',
  },
  'The Crusader Kingdom of Jerusalem: Structure and Lasting Legacy': {
    label: 'Jerusalem',
    question: 'Does 200 years of complicated coexistence — even between groups in conflict — tell us something about what is possible?',
  },
};

// Falls back to the last word of the title before any colon.
export function getPlanetMeta(title: string): PlanetMeta {
  return PLANET_META[title] ?? {
    label: (title.split(':')[0].trim().split(' ').pop() ?? title),
    question: '',
  };
}

// Fixed x/y positions (%) for up to 7 planets on the landscape canvas.
// Indexed by plant order within the mission.
export const PLANET_LAYOUT: { x: number; y: number }[] = [
  { x: 62, y: 22 },
  { x: 35, y: 42 },
  { x: 67, y: 56 },
  { x: 22, y: 68 },
  { x: 50, y: 30 },
  { x: 75, y: 50 },
  { x: 40, y: 72 },
];

// Constellation edges (planet index pairs) per planet count.
export const PLANET_EDGES: Record<number, [number, number][]> = {
  4: [[0, 1], [0, 2], [1, 3], [2, 3]],
  5: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]],
  7: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 3], [1, 4]],
};
