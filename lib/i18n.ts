// UI string translations for student-facing pages.
// Only covers static/hardcoded strings — DB content is translated separately
// via the translations JSONB column and served by the API.

export type Lang = 'en' | 'he';

const strings = {
  // ── MissionOverlay ──────────────────────────────────────────────────────────
  missionActivated: {
    en: 'ACTIVATED',
    he: 'הופעל',
  },
  acceptMission: {
    en: '✦ ACCEPT MISSION',
    he: '✦ קבל משימה',
  },
  missionLabel: {
    en: 'MISSION',
    he: 'משימה',
  },

  // ── PipGuidePanel ───────────────────────────────────────────────────────────
  howToExplore: {
    en: 'How to explore',
    he: 'איך לחקור',
  },
  howToExploreSubtitle: {
    en: 'See the mission map and planets',
    he: 'ראה את מפת הכוכבים והנושאים',
  },
  howToBody: {
    en: 'Ready to discover new worlds? Your mission map is on the left.',
    he: 'מוכן לגלות עולמות חדשים? מפת המשימה שלך נמצאת משמאל.',
  },
  clickAnyPlanet: {
    en: 'Click any planet',
    he: 'לחץ על כל כוכב לכת',
  },
  howToBodyCont: {
    en: 'to enter it and explore its topic. Good luck!',
    he: 'כדי להיכנס אליו ולחקור את הנושא שלו. בהצלחה!',
  },
  suggestStartWith: {
    en: 'I recommend starting with:',
    he: 'אני ממליץ להתחיל עם:',
  },
  exploreArrow: {
    en: 'EXPLORE →',
    he: 'לחקור →',
  },
  generateWorldBrief: {
    en: 'Generate World Brief',
    he: 'צור תקציר עולמי',
  },
  worldBriefSubtitle: {
    en: 'Understand the historical context first',
    he: 'הבן את ההקשר ההיסטורי תחילה',
  },
  worldBriefLabel: {
    en: 'World Brief',
    he: 'תקציר עולמי',
  },
  missionProject: {
    en: 'Mission Project',
    he: 'פרויקט המשימה',
  },
  askAnythingEra: {
    en: 'Ask me anything about this era…',
    he: 'שאל אותי כל דבר על התקופה הזו…',
  },
  askAnythingShort: {
    en: 'Ask me anything…',
    he: 'שאל אותי כל דבר…',
  },
  gotItReady: {
    en: 'Got it — I\'m ready to answer →',
    he: 'הבנתי — אני מוכן לענות →',
  },
  askAnythingMission: {
    en: 'Ask me anything about this mission…',
    he: 'שאל אותי כל דבר על המשימה הזו…',
  },
  gotItAccept: {
    en: 'Got it — Accept Mission →',
    he: 'הבנתי — קבל משימה →',
  },
  launchMission: {
    en: '🚀 Launch Mission',
    he: '🚀 התחל משימה',
  },
  missionActive: {
    en: '✦ Mission Active · Explore the planets',
    he: '✦ משימה פעילה · חקור את הכוכבים',
  },
  loading: {
    en: 'LOADING…',
    he: 'טוען…',
  },
  gotIt: {
    en: 'Got it',
    he: 'הבנתי',
  },
  acceptMissionChip: {
    en: 'Got it — Accept Mission',
    he: 'הבנתי — קבל משימה',
  },
  launchMissionChip: {
    en: 'Launch Mission',
    he: 'התחל משימה',
  },
  readyBuild: {
    en: 'You\'re set. Explore the planets, save insights with ✦, and return when you\'re ready to build your argument.',
    he: 'הכל מוכן. חקור את הכוכבים, שמור תובנות עם ✦, וחזור כשאתה מוכן לבנות את הטיעון שלך.',
  },
  missionBegins: {
    en: 'Your mission begins, Traveler. Explore each planet, <strong style="color:#e2e8f0">save every insight</strong> you find with ✦, and return when you\'re ready to build your case.',
    he: 'המשימה שלך מתחילה, חוקר. חקור כל כוכב לכת, <strong style="color:#e2e8f0">שמור כל תובנה</strong> שתמצא עם ✦, וחזור כשאתה מוכן לבנות את הטיעון שלך.',
  },
  takeYourTime: {
    en: 'Take your time with that. <strong style="color:#e2e8f0">Ask me anything</strong> about this era — or click <em style="color:#00d4d4">Got it</em> when you feel ready to weigh in.',
    he: 'קח את הזמן שלך. <strong style="color:#e2e8f0">שאל אותי כל דבר</strong> על התקופה הזו — או לחץ על <em style="color:#00d4d4">הבנתי</em> כשאתה מרגיש מוכן.',
  },
  thatsYourMission: {
    en: 'That\'s your mission. Take a moment to look it over — <strong style="color:#e2e8f0">ask me anything</strong> about what\'s expected, or accept when you\'re ready.',
    he: 'זו המשימה שלך. קח רגע לקרוא — <strong style="color:#e2e8f0">שאל אותי כל דבר</strong> על מה שצפוי, או קבל כשאתה מוכן.',
  },

  keyTermsLabel: {
    en: 'KEY TERMS',
    he: 'מונחים מרכזיים',
  },

  // ── Pip Smart Return — celebration & return messages ────────────────────────
  celebrationMessage: {
    en: "Good. Now go find the truth — I'm here if you need me.",
    he: 'יאללה. עכשיו לך לגלות את האמת — אני כאן אם תצטרך.',
  },
  returnNoActivity: {
    en: "I'm happy you're back! I knew you'd return. There's still so much to discover.",
    he: 'שמחתי שחזרת! ידעתי שתחזור. עוד הרבה מה לגלות.',
  },
  returnOneGoal: {
    en: 'You understood that {{goalText}} — that\'s not simple! Keep going.',
    he: 'הבנת ש{{goalText}} — זה לא פשוט! תמשיך.',
  },
  returnMultiGoals: {
    en: "You made a real breakthrough — {{goalText}}. You're building genuine understanding.",
    he: 'עשית פריצת דרך אמיתית — {{goalText}}. אתה בונה הבנה אמיתית.',
  },
  returnPlanet: {
    en: "Wow! We finally closed {{planetName}}! I didn't know someone could understand this so deeply. Where do we go next?",
    he: 'וואו! סגרנו את {{planetName}}! לא ידעתי שאפשר להבין את זה כל כך עמוק. לאן ממשיכים?',
  },

  // ── AvatarBot ───────────────────────────────────────────────────────────────
  alienScout: {
    en: 'Your Alien Scout',
    he: 'חייזר המדריך שלך',
  },
  tapToSync: {
    en: 'Tap to sync with your alien companion...',
    he: 'לחץ להתחבר עם המלווה החייזרי שלך...',
  },
  signalLost: {
    en: 'Signal lost — try again.',
    he: 'האות אבד — נסה שוב.',
  },

  // ── Planet page (landscape/[id]) ────────────────────────────────────────────
  backToMap: {
    en: '← MAP',
    he: '← מפה',
  },
  backToLandscape: {
    en: '← BACK TO LANDSCAPE',
    he: '← חזרה למפה',
  },
  yourMission: {
    en: 'YOUR MISSION',
    he: 'המשימה שלך',
  },
  speakingWith: {
    en: 'SPEAKING WITH',
    he: 'מדברים עם',
  },
  isPresenting: {
    en: 'is presenting',
    he: 'מציג',
  },

  // ── PlanetVoicePanel ────────────────────────────────────────────────────────
  startUncovering: {
    en: 'Start Uncovering →',
    he: 'התחל לחשוף →',
  },
  introduceYourself: {
    en: 'Introduce yourself and begin the discovery',
    he: 'הצג את עצמך ותתחיל לגלות',
  },
  prefillIntro: {
    en: `Hello, I'm {name}. I'm on a mission to uncover "{mission}" and I'd love your help. Tell me a little about yourself and how you connect to it.`,
    he: `שלום, אני {name}. אני במשימה לחשוף "{mission}" ואשמח לעזרתך. ספר לי קצת על עצמך ואיך אתה קשור לנושא.`,
  },
  askOrinHint: {
    en: '✦ Ask Orin for a hint',
    he: '✦ בקש רמז מאורין',
  },
  figurePlaceholderThinking: {
    en: '{name} is thinking…',
    he: '{name} חושב…',
  },
  figurePlaceholderIdle: {
    en: 'Ask me anything about this era.',
    he: 'שאל אותי כל דבר על התקופה הזו.',
  },

  // ── Planet component (landscape map) ────────────────────────────────────────
  planetLabel: {
    en: 'PLANET',
    he: 'כוכב',
  },
  exploredStatus: {
    en: 'EXPLORED',
    he: 'נחקר',
  },
  unexploredStatus: {
    en: 'UNEXPLORED',
    he: 'לא נחקר',
  },

  // ── Goal progress strip (planet drill-down) ─────────────────────────────────
  goalStripLabel: {
    en: 'goals reached',
    he: 'יעדים הושגו',
  },
  goalStripAll: {
    en: 'All goals reached ✓',
    he: 'כל היעדים הושגו ✓',
  },
  goalHintLabel: {
    en: 'hint',
    he: 'רמז',
  },
  goalHintPhrase: {
    en: 'Is there anything else you think is worthwhile for me to understand?',
    he: 'האם יש עוד משהו שלדעתך שווה שאבין?',
  },
  ofWord: {
    en: 'of',
    he: 'מתוך',
  },
  tryAsking: {
    en: 'Try asking',
    he: 'נסה לשאול את',
  },
  tryAskingNoName: {
    en: 'Try asking',
    he: 'נסה לשאול',
  },
  // ── Landscape hover ──────────────────────────────────────────────────────────
  exploringHoverLabel: {
    en: 'Exploring',
    he: 'חוקר',
  },

  // ── JourneyCard (home screen) ────────────────────────────────────────────────
  badgeLive: {
    en: 'ACTIVE',
    he: 'פעיל',
  },
  badgeVoting: {
    en: 'VOTING',
    he: 'הצבעה',
  },
  badgePending: {
    en: 'AWAITING LAUNCH',
    he: 'ממתין להשקה',
  },
  badgeDone: {
    en: '✦ COMPLETE',
    he: '✦ הושלם',
  },
  badgeIdle: {
    en: 'NOT STARTED',
    he: 'לא התחיל',
  },
  ctaContinueMission: {
    en: 'CONTINUE MISSION →',
    he: 'המשך משימה →',
  },
  ctaVoteNow: {
    en: 'VOTE NOW →',
    he: 'הצבע עכשיו →',
  },
  ctaViewResults: {
    en: 'VIEW RESULTS →',
    he: 'צפה בתוצאות →',
  },
  ctaRevisitJourney: {
    en: 'REVISIT JOURNEY →',
    he: 'בקר מחדש במסע →',
  },
  planetsExploredLabel: {
    en: 'PLANETS EXPLORED',
    he: 'כוכבים שנחקרו',
  },
  bodyLive: {
    en: '{n} of {total} planets explored on {title}.',
    he: '{n} מתוך {total} כוכבים נחקרו ב{title}.',
  },
  bodyLiveFallback: {
    en: 'Your mission is underway.',
    he: 'המשימה שלך בעיצומה.',
  },
  badgeMissionComplete: {
    en: '✦ COMPLETE',
    he: '✦ הושלם',
  },
  bodyLiveMissionComplete: {
    en: 'All {total} planets explored on {title}.',
    he: 'כל {total} הכוכבים נחקרו ב{title}.',
  },
  bodyVoting: {
    en: 'Your class is choosing the next mission. Cast your vote.',
    he: 'הכיתה שלך בוחרת את המשימה הבאה. הצבע.',
  },
  bodyPending: {
    en: 'Your class chose this mission. Your teacher is about to launch it.',
    he: 'הכיתה שלך בחרה במשימה זו. המורה שלך עומד להשיקה.',
  },
  bodyDone: {
    en: 'All {n} missions complete. Nice work, Traveller.',
    he: 'כל {n} המשימות הושלמו. עבודה מצוינת, חוקר.',
  },
  bodyIdle: {
    en: 'Your teacher is preparing this journey.',
    he: 'המורה שלך מכין את המסע הזה.',
  },

  // ── Planet Summary Screen (read-only) ───────────────────────────────────────
  hereWhatICaught: {
    en: "Here's what I caught. Real stuff.",
    he: 'הנה מה שתפסתי. דברים אמיתיים.',
  },

  // ── Planet discovery review ─────────────────────────────────────────────────
  whatIDiscoveredHere: {
    en: "What I've discovered here",
    he: 'מה גיליתי כאן',
  },
  whatIDiscoveredAll: {
    en: "What I've discovered across all planets",
    he: 'מה גיליתי בכל הכוכבים',
  },
  discoveryButtonSubtitle: {
    en: 'Review your locked planet insights',
    he: 'סקור את התובנות שלך מהכוכב',
  },
  noDiscoveriesYet: {
    en: "You haven't discovered anything yet — start exploring!",
    he: 'עוד לא גילית כלום — התחל לחקור!',
  },
  planetLockedCelebration: {
    en: "Planet locked! Here's what you discovered ✦",
    he: 'כוכב ננעל! הנה מה שגילית ✦',
  },
  closeReview: {
    en: 'Close',
    he: 'סגור',
  },
  termsEncountered: {
    en: 'Terms introduced in this conversation',
    he: 'מושגים שהוצגו בשיחה',
  },
  reviewPlanetCta: {
    en: 'Drill down to review →',
    he: 'צלול פנימה לסקירה →',
  },
  reviewPlanetCtaSubtitle: {
    en: 'Revisit this planet and go deeper on what you discovered',
    he: 'חזור לכוכב הזה וצלול עמוק יותר במה שגילית',
  },

  // ── TopBar / landscape ──────────────────────────────────────────────────────
  teacherPreviewBanner: {
    en: 'TEACHER PREVIEW · PLANET NAVIGATION DISABLED',
    he: 'תצוגה מקדימה למורה · ניווט לכוכבים מושבת',
  },
  back: {
    en: '← BACK',
    he: '← חזרה',
  },
} as const;

type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}
