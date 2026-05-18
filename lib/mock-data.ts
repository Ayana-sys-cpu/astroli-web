export const MOCK_USER = {
  email: 'ayana6@gmail.com',
  fullName: 'Ayana Reiss',
  firstName: 'Ayana',
  displayName: 'Ayana R.',
};

// Mission 1 from seed — "Who Owns The Truth?"
// The class chose this as their Big Idea (3rd in the voting list → displayed as MISSION 03).
export const MOCK_MISSION = {
  label: 'MISSION 03',
  bigIdea: 'Who Owns The Truth?',
  bigQuestion: 'Who owns the truth — the establishment or the individual?',
  subtitle: 'When the Pope and the Emperor both claim God is on their side — who decides who\'s right?',
  mission: 'The Great Sovereignty Debate — build a council argument defending your assigned side\'s claim to ultimate authority.',
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

// Plants for seed-mission-1 ("Who Owns The Truth?")
// IDs match seed.ts. x/y are % positions on the landscape map.
export const PLANETS = [
  {
    id: 'seed-plant-1-1',
    name: 'The Church',
    number: '01',
    x: 62, y: 22,
    explored: false,
    question: 'What would it actually cost an ordinary person to disagree with an institution that controlled everything?',
  },
  {
    id: 'seed-plant-1-2',
    name: 'Canossa',
    number: '02',
    x: 35, y: 42,
    explored: true,
    question: 'How does the most powerful ruler in Europe end up barefoot in the snow, begging forgiveness from a priest?',
  },
  {
    id: 'seed-plant-1-3',
    name: 'Ashkenaz',
    number: '03',
    x: 67, y: 56,
    explored: false,
    question: 'What makes authority real, if it isn\'t backed by force?',
  },
  {
    id: 'seed-plant-1-4',
    name: 'Babylonia',
    number: '04',
    x: 22, y: 68,
    explored: true,
    question: 'How do you run a legal system across the known world with nothing behind it except reputation and trust?',
  },
];

export type Message = {
  id: number;
  sender: 'figure' | 'you';
  text: string;
  time: string;
  saved?: boolean;
};

export const PLANET_DETAILS: Record<string, {
  figure: string;
  year: string;
  location: string;
  greeting: string;
  messages: Message[];
}> = {
  'seed-plant-1-1': {
    figure: 'Pope Gregory VII',
    year: '1076',
    location: 'Lateran Palace',
    greeting: "You arrive in Rome at the hour of a great struggle. The Emperor believes he can appoint bishops. He is mistaken.",
    messages: [
      { id: 1, sender: 'figure', text: "There is no corner of Europe — no birth, no marriage, no harvest, no burial — that does not pass through the hands of the Church.", time: '12:14' },
      { id: 2, sender: 'you',    text: "But the Emperor has armies. You have only priests. How can you hold power over him?", time: '12:15' },
      { id: 3, sender: 'figure', text: "Because he needs something I have that no army can provide: the blessing of God in the eyes of his subjects. Without it, his subjects are released from their oaths of loyalty to him.", time: '12:16', saved: true },
      { id: 4, sender: 'you',    text: "What is excommunication, exactly?", time: '12:17' },
      { id: 5, sender: 'figure', text: "It is expulsion from the Christian community. No sacraments. No burial in holy ground. And for a king — every vassal, every nobleman, freed from the obligation to obey him.", time: '12:18', saved: true },
      { id: 6, sender: 'you',    text: "That sounds more like a political weapon than a spiritual one.", time: '12:19' },
      { id: 7, sender: 'figure', text: "In a world where God is the source of all authority — there is no difference.", time: '12:19', saved: true },
    ],
  },

  'seed-plant-1-2': {
    figure: 'Emperor Henry IV',
    year: '1077',
    location: 'Castle of Canossa',
    greeting: "I stood barefoot in the snow outside these walls for three days. Me. The Holy Roman Emperor. Ask me how it came to this.",
    messages: [
      { id: 1, sender: 'figure', text: "January. The Apennines. No crown, no sword, no courtiers. Penitent's robes and bare feet on stone.", time: '01:12' },
      { id: 2, sender: 'you',    text: "Why did you come at all? You're the Emperor. You could have refused.", time: '01:13' },
      { id: 3, sender: 'figure', text: "My nobles were using the excommunication as justification to rebel. With it in force, I had no kingdom to return to. I came here because I had no other move.", time: '01:14', saved: true },
      { id: 4, sender: 'you',    text: "And Gregory let you back in?", time: '01:15' },
      { id: 5, sender: 'figure', text: "He had no choice. A priest cannot refuse absolution to a genuinely repentant sinner — it is doctrine. I used his own theology against him.", time: '01:16', saved: true },
      { id: 6, sender: 'you',    text: "So who actually won at Canossa?", time: '01:17' },
      { id: 7, sender: 'figure', text: "We both did. And neither did. The question of who holds authority over Christendom was not settled here. Only deferred.", time: '01:18' },
    ],
  },

  'seed-plant-1-3': {
    figure: 'Rashi of Troyes',
    year: '1090',
    location: 'Troyes, France',
    greeting: "You come from the future, I am told. Tell me — do my commentaries still survive in your time? A thousand years is a long time for parchment.",
    messages: [
      { id: 1, sender: 'figure', text: "We have no castle. No army. No king. And yet our legal decisions are followed from the Rhine to the Danube.", time: '10:30' },
      { id: 2, sender: 'you',    text: "How is that possible with no enforcement behind it?", time: '10:31' },
      { id: 3, sender: 'figure', text: "Because our authority comes from learning, not force. A ruling that can be challenged at any page, by any scholar. That is harder to undermine than a sword.", time: '10:32', saved: true },
      { id: 4, sender: 'you',    text: "What was Rabbenu Gershom's most important ruling?", time: '10:33' },
      { id: 5, sender: 'figure', text: "That correspondence is private. No one may read another's letters. In a world of constant danger, that principle protected lives — and it recognised something the Church would not: that the individual has a domain no institution may enter.", time: '10:34', saved: true },
      { id: 6, sender: 'you',    text: "Why write commentaries that ordinary people can read? Why not keep scholarship for scholars?", time: '10:36' },
      { id: 7, sender: 'figure', text: "Because if only scholars understand the tradition, the tradition belongs only to them. I write for every Jew who wants to understand. The text must be accessible, or it stops being ours.", time: '10:37', saved: true },
    ],
  },

  'seed-plant-1-4': {
    figure: 'Saadia Gaon',
    year: '930',
    location: 'Sura Academy, Babylonia',
    greeting: "From this academy we have answered questions from communities in Spain, Egypt, Persia. Without a king. Without an army. Only the word.",
    messages: [
      { id: 1, sender: 'figure', text: "You will find no throne room here. No palace. Only manuscript, ink, and argument.", time: '09:05' },
      { id: 2, sender: 'you',    text: "A question arrives from Spain. How can your answer from Babylonia carry authority there?", time: '09:06' },
      { id: 3, sender: 'figure', text: "It carries authority because communities choose to accept it. We earn that choice every year, with every answer. The moment our reasoning fails, the letters stop.", time: '09:07', saved: true },
      { id: 4, sender: 'you',    text: "What is the most important thing you've written?", time: '09:08' },
      { id: 5, sender: 'figure', text: "The Book of Beliefs and Opinions. I wrote it to show that Jewish faith and rational philosophy are not enemies. A Jew can live inside the Islamic world, read Arabic philosophy, and remain grounded in Torah.", time: '09:10', saved: true },
      { id: 6, sender: 'you',    text: "You wrote in Arabic as well as Hebrew?", time: '09:11' },
      { id: 7, sender: 'figure', text: "If I write only for those who already know Hebrew, I have already abandoned most of my community. Truth must be accessible. Otherwise it is not truth — it is gatekeeping.", time: '09:12', saved: true },
    ],
  },
};

// Pre-saved insights from the Canossa planet (seed-plant-1-2), shown in the notebook
export const NOTEBOOK_INSIGHTS = [
  { id: 1, source: 'Emperor Henry IV', time: '01:14', tag: 'CANOSSA',
    text: 'Without the excommunication lifted, I had no kingdom to return to. I came here because I had no other move.' },
  { id: 2, source: 'Emperor Henry IV', time: '01:16', tag: 'CANOSSA',
    text: 'I used his own theology against him. A priest cannot refuse absolution to a genuinely repentant sinner.' },
  { id: 3, source: 'You', time: '01:17', tag: null,
    text: 'So who actually won? — it feels like both sides claimed victory and both lost something.' },
  { id: 4, source: 'Emperor Henry IV', time: '01:18', tag: 'CANOSSA',
    text: 'The question of authority was not settled here. Only deferred.' },
];
