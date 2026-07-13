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
    en: '✦ Accept mission',
    he: '✦ קבל משימה',
  },
  missionLabel: {
    en: 'MISSION',
    he: 'משימה',
  },

  // ── OrinGuidePanel ───────────────────────────────────────────────────────────
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
    en: 'Explore →',
    he: 'לחקור →',
  },
  missionProject: {
    en: 'Mission Project',
    he: 'פרויקט המשימה',
  },
  askAnythingEra: {
    en: 'Ask me anything about this era…',
    he: 'שאל אותי כל דבר על התקופה הזו…',
  },
  qaFallbackReply: {
    en: "Great question, explorer! I don't have a ready answer for that one — the planets on your mission map are the best place to investigate it. Pick one and see what you discover!",
    he: 'שאלה מצוינת, חוקר! אין לי תשובה מוכנה לשאלה הזו — כוכבי הלכת במפת המשימה שלך הם המקום הטוב ביותר לחקור אותה. בחר אחד וגלה מה תמצא!',
  },
  askAnythingShort: {
    en: 'Ask me about this mission…',
    he: 'שאל אותי כל דבר…',
  },
  chatRetry: {
    en: 'That didn’t go through — tap to try again',
    he: 'זה לא נשלח — הקש כדי לנסות שוב',
  },
  gotItReady: {
    en: 'Got it — start exploring →',
    he: 'הבנתי — התחל לחקור →',
  },
  askAnythingMission: {
    en: 'Ask me anything about this mission…',
    he: 'שאל אותי כל דבר על המשימה הזו…',
  },
  gotItAccept: {
    en: 'Got it — Accept mission →',
    he: 'הבנתי — קבל משימה →',
  },
  launchMission: {
    en: '🚀 Launch mission',
    he: '🚀 התחל משימה',
  },
  missionActive: {
    en: '✦ Mission active — keep going',
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
    en: 'Got it — Accept mission',
    he: 'הבנתי — קבל משימה',
  },
  launchMissionChip: {
    en: 'Launch mission',
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
  thatsYourMission: {
    en: 'That\'s your mission. Take a moment to look it over — <strong style="color:#e2e8f0">ask me anything</strong> about what\'s expected, or accept when you\'re ready.',
    he: 'זו המשימה שלך. קח רגע לקרוא — <strong style="color:#e2e8f0">שאל אותי כל דבר</strong> על מה שצפוי, או קבל כשאתה מוכן.',
  },

  keyTermsLabel: {
    en: 'KEY TERMS',
    he: 'מונחים מרכזיים',
  },

  // ── Orin Smart Return — celebration & return messages ────────────────────────
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
    en: '← Map',
    he: '← מפה',
  },
  backToLandscape: {
    en: '← Back to landscape',
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
  badgeIdleFamily: {
    en: 'PICK A MISSION',
    he: 'בחר משימה',
  },
  ctaPickMission: {
    en: 'Choose mission →',
    he: 'בחר משימה →',
  },
  ctaContinueMission: {
    en: 'Continue mission →',
    he: 'המשך משימה →',
  },
  ctaVoteNow: {
    en: 'Vote now →',
    he: 'הצבע עכשיו →',
  },
  ctaViewResults: {
    en: 'View results →',
    he: 'צפה בתוצאות →',
  },
  ctaRevisitJourney: {
    en: 'Revisit journey →',
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
  discoveriesHint: {
    en: 'Your discoveries will appear here as you explore.',
    he: 'הגילויים שלך יופיעו כאן כשתחקור.',
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
    en: '← Back',
    he: '← חזרה',
  },
  signOut: {
    en: 'Sign Out',
    he: 'התנתקות',
  },
  guideLabel: {
    en: 'GUIDE',
    he: 'מדריך',
  },
  talkTo: {
    en: 'Talk to {name}',
    he: 'דברו עם {name}',
  },
  clickToExplore: {
    en: 'Click to explore this planet',
    he: 'לחצו כדי לחקור את הכוכב הזה',
  },

  // ── Planet Completion Celebration overlay ───────────────────────────────────
  claimReward: {
    en: 'Claim reward',
    he: 'קבל פרס',
  },
  claiming: {
    en: 'Claiming…',
    he: 'מקבל…',
  },
  whatDidILearn: {
    en: 'What did I learn?',
    he: 'מה למדתי?',
  },
  whereNext: {
    en: 'Where next?',
    he: 'לאן עכשיו?',
  },
  exploreNext: {
    en: 'Explore {name}',
    he: 'חקור את {name}',
  },
  celebrationBackToMap: {
    en: 'Back to Map',
    he: 'חזרה למפה',
  },
  skipCelebration: {
    en: '✕ Skip',
    he: '✕ דלג',
  },
  noInsightsYet: {
    en: 'No key learnings captured — keep exploring!',
    he: 'לא נשמרו תובנות — המשך לחקור!',
  },
  missionComplete: {
    en: 'Mission Complete!',
    he: '!משימה הושלמה',
  },
  coinsEarned: {
    en: 'coins earned',
    he: 'מטבעות הרווחת',
  },
  backToHome: {
    en: 'Back to Home',
    he: 'חזרה לדף הבית',
  },
  entireMissionComplete: {
    en: 'You explored every planet in this mission!',
    he: 'חקרת את כל כוכבי הלכת במשימה הזו!',
  },
  chooseNextMission: {
    en: 'Choose your next mission',
    he: 'בחר את המשימה הבאה שלך',
  },
  achievementUnlocked: {
    en: 'ACHIEVEMENT UNLOCKED',
    he: 'הישג נפתח',
  },
  coinsShort: {
    en: 'COINS',
    he: 'מטבעות',
  },
  claimedLabel: {
    en: 'CLAIMED',
    he: 'נאסף',
  },
  planetCompleteBadge: {
    en: 'COMPLETE',
    he: 'הושלם',
  },
  insightsAndTerms: {
    en: '{insights} insights · {terms} new terms',
    he: '{insights} תובנות · {terms} מושגים חדשים',
  },
  hereEverythingCaught: {
    en: "Here's everything you caught",
    he: 'הנה כל מה שתפסת',
  },
  newTermsVocab: {
    en: 'New terms in your vocabulary',
    he: 'מושגים חדשים באוצר המילים שלך',
  },
  whereToNext: {
    en: 'Where to next?',
    he: 'לאן הלאה?',
  },
  orinName: {
    en: 'ORIN',
    he: 'אורין',
  },
  missionProgressLabel: {
    en: 'MISSION PROGRESS',
    he: 'התקדמות במשימה',
  },
  planetsCount: {
    en: '{completed} / {total} PLANETS',
    he: '{completed} / {total} כוכבים',
  },
  nextDestination: {
    en: 'NEXT DESTINATION',
    he: 'היעד הבא',
  },
  celebrationOrinSpeech: {
    en: '“Nice work. {name} is glowing on the map — I have a good feeling about that one.”',
    he: '"עבודה יפה. {name} זוהר על המפה — יש לי הרגשה טובה לגביו."',
  },
  celebrationOrinSpeechMission: {
    en: '“You explored every planet here. The whole mission is yours — let’s find the next one.”',
    he: '"חקרת כל כוכב כאן. כל המשימה שלך — בוא נמצא את הבאה."',
  },
  takeMeBackToMap: {
    en: 'or just take me back to the map',
    he: 'או פשוט קח אותי חזרה למפה',
  },

  // ── Planet drill-down — celebration / reward / fallbacks ───────────────────
  planetExplored: {
    en: 'Planet Explored!',
    he: 'הכוכב נחקר!',
  },
  goalReached: {
    en: 'Goal Reached',
    he: 'יעד הושג',
  },
  uncoveredEverySecret: {
    en: "You've uncovered every secret on this planet.",
    he: 'חשפת כל סוד בכוכב הזה.',
  },
  keepExploringUniverse: {
    en: 'Keep exploring the universe.',
    he: 'המשיכו לחקור את היקום.',
  },
  orinProudOfYou: {
    en: "Orin is proud of you! You've uncovered every secret on this planet.",
    he: 'אורין גאה בך! חשפת כל סוד בכוכב הזה.',
  },
  seeMyDiscoveries: {
    en: 'See my discoveries →',
    he: 'הצגת התגליות שלי →',
  },
  planetNotFound: {
    en: 'Planet not found',
    he: 'הכוכב לא נמצא',
  },
  noCharacterAvailable: {
    en: 'No character available for this planet.',
    he: 'אין דמות זמינה בכוכב הזה.',
  },
  characterLoadFailed: {
    en: "Couldn't reach this planet's character. Please try again in a moment.",
    he: 'לא הצלחנו להתחבר לדמות של הכוכב. נסו שוב בעוד רגע.',
  },
  temporalLink: {
    en: 'TEMPORAL LINK',
    he: 'קישור זמן',
  },
  ceSuffix: {
    en: 'CE',
    he: 'לספירה',
  },
  whatOrinToldMe: {
    en: 'What {name} told me',
    he: 'מה {name} אמר לי',
  },
  travelerName: {
    en: 'Traveler',
    he: 'חוקר',
  },
  thisMissionFallback: {
    en: 'this mission',
    he: 'המשימה הזו',
  },

  // ── MissionOrbit / home card ────────────────────────────────────────────
  pickYourNextWorld: {
    en: 'Pick your next world',
    he: 'בחר את העולם הבא שלך',
  },
  missionCompletePickNext: {
    en: 'Mission complete!',
    he: '!משימה הושלמה',
  },
  doneReview: {
    en: 'Done · review',
    he: 'הושלם · סקירה',
  },
  orbitContinue: {
    en: '▸ Continue',
    he: '▸ המשך',
  },
  orbitLocked: {
    en: 'Locked',
    he: 'נעול',
  },
  orbitIgnite: {
    en: 'Initiate mission',
    he: 'הצת משימה',
  },
  missionsDoneOf: {
    en: '{n} / {total} done',
    he: '{n} / {total} הושלמו',
  },
  reviewModeBanner: {
    en: 'REVIEWING PAST MISSION',
    he: 'סוקר משימה קודמת',
  },

  // ── Home screen (page-level) ────────────────────────────────────────────────
  welcomeBack: {
    en: 'Welcome back, {name}.',
    he: 'ברוך שובך, {name}.',
  },
  syncingJourneys: {
    en: 'SYNCING YOUR JOURNEYS…',
    he: 'מסנכרן את המסעות שלך…',
  },
  journeyAwaits: {
    en: 'YOUR JOURNEY AWAITS ACROSS THE STARS',
    he: 'המסע שלך מחכה בין הכוכבים',
  },
  journeysCountOne: {
    en: 'YOU HAVE 1 JOURNEY ACROSS THE STARS',
    he: 'יש לך מסע אחד בין הכוכבים',
  },
  journeysCountMany: {
    en: 'YOU HAVE {n} JOURNEYS ACROSS THE STARS',
    he: 'יש לך {n} מסעות בין הכוכבים',
  },
  yourJourneys: {
    en: 'YOUR JOURNEYS',
    he: 'המסעות שלך',
  },
  syncingShort: {
    en: 'SYNCING…',
    he: 'מסנכרן…',
  },
  mapLoadError: {
    en: 'This part of the galaxy slipped out of range.',
    he: 'החלק הזה של הגלקסיה יצא מהטווח.',
  },
  tryAgain: {
    en: 'Try again',
    he: 'נסה שוב',
  },

  // ── Vote screen ─────────────────────────────────────────────────────────────
  voteTopBar: {
    en: 'MISSION SELECTION · VOTE',
    he: 'בחירת משימה · הצבעה',
  },
  voteSyncing: {
    en: 'SYNCING VOTE DATA…',
    he: 'מסנכרן נתוני הצבעה…',
  },
  voteSubmitError: {
    en: "Something glitched in the cosmos — your vote didn't send. Tap to try again.",
    he: 'משהו השתבש בקוסמוס — ההצבעה שלך לא נשלחה. הקש לניסיון נוסף.',
  },
  chooseYourMission: {
    en: 'Choose your mission, {name}.',
    he: 'בחר את המשימה שלך, {name}.',
  },
  voteShapesJourney: {
    en: 'YOUR VOTE SHAPES THE JOURNEY',
    he: 'ההצבעה שלך מעצבת את המסע',
  },
  winnerChosen: {
    en: 'WINNER CHOSEN · AWAITING LAUNCH',
    he: 'הזוכה נבחר · ממתין להשקה',
  },
  voteClosed: {
    en: 'VOTE CLOSED',
    he: 'ההצבעה נסגרה',
  },
  voteJustClosed: {
    en: 'This vote just closed — showing the results…',
    he: 'ההצבעה הרגע נסגרה — מציג את התוצאות…',
  },
  closesIn: {
    en: 'CLOSES IN {time}',
    he: 'נסגרת בעוד {time}',
  },
  voteOrinHint: {
    en: 'Each mission is a different path through history. Pick the one that calls to you — your class votes together to decide the journey.',
    he: 'כל משימה היא נתיב אחר דרך ההיסטוריה. בחרו את זו שקוראת לכם — הכיתה מצביעה יחד כדי להחליט על המסע.',
  },
  chosenBadge: {
    en: 'CHOSEN ✦',
    he: 'נבחרה ✦',
  },
  yourVoteBadge: {
    en: 'YOUR VOTE ✦',
    he: 'ההצבעה שלך ✦',
  },
  voteCountOne: {
    en: '1 vote',
    he: 'קול אחד',
  },
  voteCountMany: {
    en: '{n} votes',
    he: '{n} קולות',
  },
  awaitingMissionLaunch: {
    en: 'AWAITING MISSION LAUNCH',
    he: 'ממתין להשקת המשימה',
  },
  teacherAboutToLaunch: {
    en: 'Your teacher is about to launch the chosen mission',
    he: 'המורה שלך עומד להשיק את המשימה שנבחרה',
  },
  voteLockedIn: {
    en: 'VOTE LOCKED IN',
    he: 'ההצבעה נקלטה',
  },
  canChangeVote: {
    en: 'You can change your vote until the window closes',
    he: 'אפשר לשנות את ההצבעה עד סגירת החלון',
  },
  changeVote: {
    en: 'Change vote',
    he: 'שינוי הצבעה',
  },
  submitting: {
    en: 'SUBMITTING…',
    he: 'שולח…',
  },
  castMyVote: {
    en: 'Cast my vote ✦',
    he: 'הצבע ✦',
  },
  selectMissionFirst: {
    en: 'Select a mission first',
    he: 'בחרו משימה תחילה',
  },
  missionSelectedImminent: {
    en: 'MISSION SELECTED · LAUNCH IMMINENT',
    he: 'המשימה נבחרה · ההשקה קרובה',
  },
  missionSelectionInProgress: {
    en: 'MISSION SELECTION IN PROGRESS',
    he: 'בחירת המשימה בעיצומה',
  },
} as const;

type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}
