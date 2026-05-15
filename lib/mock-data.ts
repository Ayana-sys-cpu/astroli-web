export const MOCK_USER = {
  email: 'ayana6@gmail.com',
  fullName: 'Ayana Reiss',
  firstName: 'Ayana',
  displayName: 'Ayana R.',
};

export const MOCK_MISSION = {
  label: 'MISSION 03',
  bigIdea: 'Who Owns The Truth?',
  subtitle: 'Your class chose this Big Idea. Build a civilization that answers it.',
  mission: 'Build Your Civilization — a brand-new society with its own people and rules.',
  bigQuestion: 'In your world, who owns "The Truth"?',
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

export const PLANETS = [
  { id: 'gutenberg-bible',   name: 'Gutenberg Bible',   number: '01', x: 61, y: 22, explored: false,
    question: 'Did mass-printing unify humanity or fracture it into competing truths?' },
  { id: 'printing-press',    name: 'Printing Press',    number: '02', x: 34, y: 43, explored: true,
    question: 'Did the printing press liberate the human mind or constrain it within new structures?' },
  { id: 'press-public',      name: 'Press & Public',    number: '03', x: 67, y: 46, explored: false,
    question: 'Who decides what "the public" deserves to know?' },
  { id: 'scriptures',        name: 'Scriptures',        number: '04', x: 47, y: 62, explored: false,
    question: 'When a sacred text is translated, who owns the meaning?' },
  { id: 'royal-decree',      name: 'Royal Decree',      number: '05', x: 52, y: 75, explored: true,
    question: 'If the king declares it, does it become truth?' },
  { id: 'protest-pamphlet',  name: 'Protest Pamphlet',  number: '06', x: 19, y: 68, explored: false,
    question: 'Can a single voice, widely copied, change what a society believes?' },
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
  'printing-press': {
    figure: 'Johannes Gutenberg',
    year: '1450',
    location: 'Workshop',
    greeting: "You're not from my time, are you, traveler?",
    messages: [
      { id: 1, sender: 'figure', text: "I have not seen clothing such as yours, traveler. What brings you to my workshop?", time: '05:14' },
      { id: 2, sender: 'you',    text: "2050. I'm here to learn about your press.", time: '05:14' },
      { id: 3, sender: 'figure', text: "Look here, traveler. This stain — three weeks old.", time: '05:18' },
      { id: 4, sender: 'you',    text: "What went wrong with that batch?", time: '05:18' },
      { id: 5, sender: 'figure', text: "Too oily. The metal type drinks it and the page smears. Tomorrow — linseed.", time: '05:19' },
      { id: 6, sender: 'figure', text: "Three years it took me. The ink alone — too oily, then too thin...", time: '05:22', saved: true },
      { id: 7, sender: 'you',    text: "Three years for one Bible. But one workshop, three years.", time: '05:22' },
      { id: 8, sender: 'figure', text: "Scale, not speed: that's the real shift.", time: '05:24', saved: true },
      { id: 9, sender: 'figure', text: "The Archbishop. He wanted Bibles he could distribute.", time: '05:30', saved: true },
    ],
  },
  'gutenberg-bible': {
    figure: 'Heinrich Cremer',
    year: '1456',
    location: 'Cathedral Library',
    greeting: "This Bible was hand-illuminated by monks. Each page took a week.",
    messages: [
      { id: 1, sender: 'figure', text: "You stand before the first mass-produced book. Can you feel it?", time: '06:10' },
      { id: 2, sender: 'you',    text: "How many copies were printed?", time: '06:10' },
      { id: 3, sender: 'figure', text: "One hundred and eighty. Each copy identical — yet it unsettles me.", time: '06:12', saved: true },
      { id: 4, sender: 'you',    text: "Why unsettling?", time: '06:13' },
      { id: 5, sender: 'figure', text: "Because now any man may read, and every man may interpret.", time: '06:14', saved: true },
    ],
  },
};

export const NOTEBOOK_INSIGHTS = [
  { id: 1, source: 'Johannes Gutenberg', time: '09:19', tag: 'WORKSHOP',
    text: 'Three years it took me. The ink alone — too oily, then too thin...' },
  { id: 2, source: 'Johannes Gutenberg', time: '09:22', tag: 'WORKSHOP',
    text: 'Three years for one Bible. But one workshop, three years.' },
  { id: 3, source: 'You',                time: '09:24', tag: null,
    text: 'Scale, not speed: that\'s the real shift.' },
  { id: 4, source: 'Johannes Gutenberg', time: '09:30', tag: 'WORKSHOP',
    text: 'The Archbishop. He wanted Bibles he could distribute.' },
];
