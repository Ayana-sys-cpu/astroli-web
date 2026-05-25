// =============================================================================
// HARDCODED MISSION & PLANT CONTENT — Phase 1
//
// Single source of truth for the Medieval History journey content.
// Used by /api/teacher/connect to seed every new journey automatically.
//
// To update content: edit the objects below.
// To add a mission: append to the MISSIONS array (keep mission_order sequential).
// =============================================================================

export interface PlantSeed {
  title:           string;
  label:           string;
  content:         string;
  opening_message: string;
}

export interface MissionSeed {
  mission_order:        number;
  question:             string;
  question_description: string;
  project_title:        string;
  project_description:  string;
  opening_message:      string;
  plants:               PlantSeed[];
}

export const HARDCODED_MISSIONS: MissionSeed[] = [
  // ── Mission 1 ──────────────────────────────────────────────────────────────
  {
    mission_order: 1,
    question: 'Who owns the truth — the establishment or the individual?',
    question_description:
      'In the Middle Ages, "truth" was not a personal opinion — it was an official position, guarded and declared by powerful institutions. The Church decided what was spiritually true. The Emperor decided what was politically true. Jewish communities built their own parallel systems of truth to survive in exile. This Mission asks: when powerful institutions control what counts as real and legitimate, what room is left for the individual? And what happens when two institutions both claim the same authority?',
    project_title: 'The Great Sovereignty Debate',
    project_description: `You are a delegate attending a special council in the year 1076 CE — the height of the Investiture Controversy, the moment when Pope Gregory VII and Holy Roman Emperor Henry IV are locked in open conflict over who has the ultimate right to appoint Church officials, and by extension, who rules God's world on earth.

You have been assigned a side:

TEAM POPE — You represent the Papal position. Your argument: the Pope holds the "Keys to Heaven." All earthly authority flows from God, and God speaks through the Church. No emperor can claim to rule without the Pope's blessing.

TEAM EMPEROR — You represent the Imperial position. Your argument: the Emperor wields "The Sword." Rulers receive their authority directly from God to maintain order on earth. The Church should tend to souls — not thrones.

Your task: Build an argument defending your side's claim to be the ultimate source of truth and order on earth. Your argument must:

1. State your position clearly and explain the theological or political logic behind it.
2. Include at least two pieces of evidence drawn from the Plants in this Mission.
3. Anticipate and directly respond to at least one argument the opposing side is likely to make.
4. Close with a statement about why, if your side loses, the consequences would be catastrophic for the world.

How to submit — choose one:
📝 Written argument — A structured 2–3 page written speech in your character's voice.
🎙️ Recorded argument — A 3–5 minute audio or video recording of you delivering the argument in character.`,
    opening_message: `Traveler, my scanners are glitching. Two historical leaders are claiming they own the ultimate truth. At the exact same time. The Pope says God chose him. The Emperor says the same thing. Who do you think has more actual power here?`,
    plants: [
      {
        title: 'The Central Role of the Catholic Church in Medieval Society',
        label: 'Church',
        opening_message: `Traveler. Before you go in — I need you to understand the scale of what you're scanning.

This isn't just about religion. The Church ran the hospitals. The schools. The courts. The calendar. If you were born in medieval Europe, the Church was involved in literally every major moment of your life — from baptism to burial.

Here's what I want you to figure out while you're in there: what would it actually cost an ordinary person to disagree with an institution that controlled all of that?`,
        content: `In the Middle Ages, the Catholic Church was not simply a place of worship — it was the backbone of European society. The Church ran hospitals, schools, and courts. It collected taxes. It governed the calendar. From birth (baptism) to death (last rites), no major life event happened outside the Church's authority.

At the top sat the Pope in Rome. Below him, a vast network of archbishops, bishops, and parish priests reached into every village in Europe. The Church owned roughly one third of all land in Western Europe. It was, in modern terms, both the government and the media — the institution that told people what was true, what was right, and what would happen to them after they died.

The Church's most powerful weapon was excommunication — the formal removal of a person from the Christian community. An excommunicated person could not receive the sacraments, could not be buried in consecrated ground, and was effectively expelled from society. For a medieval king, excommunication was politically catastrophic: it released his subjects from their oath of loyalty to him.

Think about this: If the Church controlled education, law, spiritual salvation, and access to the afterlife — was it really possible for an ordinary person to disagree with it? What would disagreement actually cost them?`,
      },
      {
        title: 'The Pope vs. The Emperor: The Investiture Controversy',
        label: 'Canossa',
        opening_message: `A sitting Pope excommunicated a Holy Roman Emperor.

The Emperor — one of the most powerful men in the world — ended up standing barefoot in the snow outside a castle for three days, begging forgiveness. It actually happened. 1077 CE.

What I want you to find out: how does someone with that much power end up in that position? And what does it tell us about who was really in charge?`,
        content: `In 1076, Pope Gregory VII did something that had never been done before: he excommunicated a sitting Holy Roman Emperor, Henry IV.

The cause was a dispute called the Investiture Controversy — a conflict over who had the right to "invest" (appoint) bishops and abbots. Bishops controlled land, armies, and wealth. Whoever appointed them effectively controlled the most powerful institutions in medieval Europe.

Henry IV's response to excommunication was defiance — at first. But his nobles, now freed from their oaths of loyalty by the Pope's decree, began to rebel. Henry had no choice. In January 1077, he walked barefoot through the snow to the castle of Canossa in northern Italy, where Gregory was staying, and stood outside for three days in penitent's clothing, begging forgiveness.

It was one of the most humiliating moments in the history of European monarchy — and one of the most dramatic demonstrations of Papal power ever recorded.

Think about this: Both the Pope and the Emperor believed they were defending God's order on earth. How do we make sense of a conflict where both sides think they are right — and both sides have real power to back that claim?`,
      },
      {
        title: 'The Jewish Community in Ashkenaz: Rabbenu Gershom and Rashi',
        label: 'Ashkenaz',
        opening_message: `Here's something that doesn't add up at first, Traveler.

A community with no army, no castle, and no political power in the Christian world — and yet they built a system of law and leadership that lasted a thousand years and is still in use today.

I want you to come out of this one with an answer to this: what makes authority real, if it's not backed by force?`,
        content: `While the Pope and Emperor fought over who controlled Christian Europe, Jewish communities across Northern France and Germany — collectively known as Ashkenaz — were building a parallel world with its own laws, courts, and leaders.

Rabbenu Gershom (c. 960–1028), known as the "Light of the Exile," convened rabbinical councils that established binding communal rules for all Ashkenazic Jews. His rulings included the prohibition on polygamy and an early recognition of privacy as a value.

Rashi (Rabbi Solomon ben Isaac, 1040–1105), who lived in Troyes, France, wrote commentaries on the Torah and Talmud so clear and comprehensive that they are still printed alongside the original texts today, nearly a thousand years later.

Think about this: How did Jewish communities maintain their own system of law, their own definition of truth, and their own leadership — while living entirely inside a society with completely different answers to those same questions?`,
      },
      {
        title: 'The Geonim of Babylonia: Jewish Leadership in Exile',
        label: 'Babylonia',
        opening_message: `The Jewish people had no homeland, no Temple, and no king.

And yet, from academies in Babylonia — modern-day Iraq — they ran a legal system that served Jewish communities from Spain to Persia. People wrote questions. They wrote back. And communities across the world treated those answers as binding law.

How? That's the question. Go find out what made that kind of authority work — with nothing behind it except reputation and trust.`,
        content: `Centuries before Rashi was born, the centre of Jewish intellectual life was not in Europe at all — it was in Babylonia (modern-day Iraq), in the academies of Sura and Pumbedita.

The leaders of the Babylonian academies, known as Geonim, served as the supreme legal authorities for Jewish communities across the known world — from Spain to Persia to North Africa. Jews who had a legal question they couldn't resolve locally would write to the Gaon. The Gaon would respond in writing, and the response carried the authority of a court ruling.

This system worked without an army, without a police force, and without any political power. Its authority rested entirely on reputation, scholarship, and the voluntary trust of the communities that used it.

Think about this: The Geonim created a system of authority that worked without a homeland, a Temple, or political power. What made that kind of authority legitimate to the people who accepted it?`,
      },
    ],
  },

  // ── Mission 2 ──────────────────────────────────────────────────────────────
  {
    mission_order: 2,
    question: 'What happens when power expands beyond the reach of law?',
    question_description:
      'After the fall of the Roman Empire, Europe descended into a world with no stable government, no reliable army, and no guaranteed safety. In response, people made a deal: give up your freedom in exchange for protection. This is the Feudal Bargain — and for hundreds of years, it shaped every aspect of daily life. This Mission asks: when the world feels dangerous and chaotic, how much freedom are people willing to trade away for security? And what happens when that bargain starts to look less like protection and more like control?',
    project_title: 'The Feudal Terms of Service',
    project_description: `Every app you use has a Terms of Service — a legal agreement you accept in exchange for access to something you want. Usually, nobody reads it. But what if the terms were your entire life?

Your task is to draft a Feudal Terms of Service — a modern-style agreement that a serf or vassal must agree to in order to receive protection and land from their lord.

Your document must include all five of the following sections:

1. WHAT YOU ARE AGREEING TO RECEIVE — List the specific protections, resources, and rights the lord provides.
2. WHAT YOU AGREE TO GIVE UP — List the specific freedoms and obligations surrendered.
3. CONSEQUENCES OF BREACH — What happens if either party fails to meet their obligations?
4. ARBITRATION CLAUSE — Who settles disputes? The Church? The King? A higher lord?
5. WHY I AGREED: A PERSONAL STATEMENT — Written in the first-person voice of the serf or vassal.

How to submit — choose one:
📝 Written document — The full Terms of Service as a formatted text document.
🎙️ Recorded walkthrough — A 3–5 minute audio or video recording presenting the key terms.
🎨 Illustrated contract — A visual document combining art and text.`,
    opening_message: `Traveler — I need you to picture something.

No police. No army. No government to call. Raiders could arrive in your village tonight, and no one is coming to help. That's not a hypothetical. For most people in medieval Europe, that was just a Tuesday.

The question your mission is asking — how much freedom would you trade for safety — was the most important question of their lives. So I'll ask you first: what would you give up? And what would you refuse to give up, no matter what?`,
    plants: [
      {
        title: 'The Fall of Rome and the Conditions That Created Feudalism',
        label: 'Rome',
        opening_message: `Rome didn't fall on a single day, Traveler. It unravelled.

And what went with it wasn't just an emperor or a capital city. It was roads, law, a professional army — the entire infrastructure that made safety possible. When that collapsed, there was no emergency number to call.

I want you to come out of this one with a clear picture of what it actually felt like to live in that vacuum. Because the bargain people made next only makes sense if you feel the fear first.`,
        content: `In 476 CE, the last Roman Emperor in the West was deposed by a Germanic chieftain. But Rome hadn't really "fallen" on that day — it had been unravelling for centuries.

What Rome provided, at its peak, was infrastructure: roads, law, a professional army, a stable currency, and a government that could resolve disputes and enforce agreements across a vast territory. When that infrastructure collapsed, so did safety.

Viking raids struck coastal communities from Ireland to Russia. Magyar horsemen raided deep into Central Europe. Saracen pirates controlled the Mediterranean coastlines. There was no emergency number to call. There was no army funded by your taxes. There was no court to hear your complaint.

Feudalism was not invented by a philosopher or decreed by a king. It emerged organically from this environment of fear. Local strongmen — men with horses, weapons, and walls — began offering protection in exchange for labour and loyalty.

Think about this: If there were no police, no army, and no government — and raiders could arrive at any time — what would you be willing to agree to in exchange for safety?`,
      },
      {
        title: 'The Feudal Hierarchy: Kings, Nobles, Vassals, and Serfs',
        label: 'Hierarchy',
        opening_message: `You've probably seen the pyramid diagram. King at the top, peasants at the bottom. Forget it for a second.

Feudalism wasn't really a pyramid. It was a web of personal promises — each one individually sworn, each one binding. Every level had obligations running in both directions. Break your oath and you weren't just breaking a rule — you were breaking a sacred bond.

Here's what I want you to figure out: where in this web would you actually want to be — and what would you have to give up to get there?`,
        content: `Feudalism is often drawn as a pyramid — king at the top, nobles below, knights below them, peasants at the base. The pyramid is useful but misleading. Feudalism was less like a corporation with a clear chain of command and more like a web of personal promises, each individually negotiated.

The core of feudalism was the oath of homage and fealty. A vassal knelt before a lord, placed his hands between the lord's, and swore an oath of loyalty. In return, the lord granted the vassal a fief — usually land. This ceremony was a legal contract. Breaking it was not just a political act; it was a moral betrayal.

At the bottom sat the serfs — who were different from vassals in a crucial way. A vassal entered his relationship by choice (at least in theory). A serf was bound to the land itself. If the land was sold, the serf came with it.

Think about this: Every level of this hierarchy had obligations running in both directions. Where in this pyramid would you rather have been?`,
      },
      {
        title: 'The Three Orders: Those Who Pray, Those Who Fight, Those Who Work',
        label: 'Orders',
        opening_message: `Every society tells itself a story about why things are the way they are.

Medieval Europe's story was this: God designed three kinds of people — those who pray, those who fight, and those who work. Each has its role. Each is sacred. Accepting your place in that system isn't just a social norm — it's a religious duty.

I need you to think about something while you're reading this: who benefits most from that particular story? And is that a coincidence?`,
        content: `Medieval society had a story it told about itself — and that story was very convenient for the people at the top.

In the 10th century, a bishop named Adalbero of Laon articulated what became the dominant ideological framework of medieval Europe: God had divided humanity into three orders. Those who pray (oratores). Those who fight (bellatores). Those who work (laboratores). Each order had its God-given role. Accepting your place in this system was not just a social norm — it was a religious obligation.

Notice what this ideology accomplished: it made the suffering of the laborers sacred. It made the wealth of the nobles divinely ordained. It made any challenge to the system not just illegal but sinful.

Think about this: When a social hierarchy is described as God's design, what effect does that have on people's ability — or willingness — to question it?`,
      },
      {
        title: 'Daily Life in Feudal Society',
        label: 'Serfdom',
        opening_message: `We've been talking about systems and hierarchies. Now let's talk about a person.

Someone who was born on a manor, works the same fields their parents worked, owes the lord a portion of every harvest, and cannot leave without permission. Not as a prisoner — as a serf. That was a legal category. A normal life.

What I want you to find in here is the texture of that life — not just the obligations, but what it actually felt like day to day.`,
        content: `The manor was the basic unit of feudal life — a self-contained world of fields, a mill, a church, workshops, and the lord's hall or castle. Most people who lived on a manor were born, lived, and died there without ever travelling more than a few miles.

For a serf, the agricultural year was relentless. Spring: ploughing and planting. Summer: tending crops, repairing tools and buildings. Autumn: harvest. Winter: the hunger months, living off what had been stored, praying the stores lasted until spring. A bad harvest could mean starvation.

But feudal life was not purely grim. The lord's walls offered refuge during raids. The lord's granary could provide emergency food in a famine. The community of the village gave peasant life texture and meaning.

Think about this: Based on what you've learned about daily life, was the Feudal Bargain a fair deal?`,
      },
      {
        title: 'The Rise of Cities and Urban Autonomy: Guilds and Universities',
        label: 'Cities',
        opening_message: `Feudalism had a plan for three kinds of people: clergy, nobles, peasants.

Then a fourth kind appeared. Merchants. Craftspeople. Scholars. People who didn't fit any of the three categories — and who were quietly accumulating wealth and influence the system hadn't anticipated.

Here's your mission going in: find out what kind of bargain city life offered — and whether it was actually better than the feudal one, or just a different set of trade-offs.`,
        content: `Feudalism assumed that everyone fit into one of three categories: clergy, noble, or peasant. But beginning in the 10th and 11th centuries, a new kind of person appeared in Europe — merchants, craftspeople, moneylenders, lawyers, scholars — people who accumulated wealth and influence that the feudal hierarchy hadn't anticipated.

Guilds were associations of craftspeople or merchants in the same trade that set quality standards, trained apprentices, and provided mutual support. Universities emerged in Bologna, Paris, and Oxford — institutions outside the direct control of any lord or bishop.

A person could move to a town, live there for a year and a day, and be legally free of serfdom.

Think about this: Cities offered a different kind of bargain from the feudal one. What made the urban bargain attractive? What did people gain — and what new things did they give up in exchange?`,
      },
    ],
  },

  // ── Mission 3 ──────────────────────────────────────────────────────────────
  {
    mission_order: 3,
    question: "Who gets to define what's true — and what it costs to disagree?",
    question_description:
      'Between the 7th and 13th centuries, Christianity, Islam, and Judaism were not isolated from each other — they collided, competed, traded, translated, and sometimes even collaborated. The Crusades are the most famous collision, but they are only one part of a much larger story. This Mission asks: when civilisations meet, does someone always have to win? Or is it possible for cultures to transform each other without one side conquering the other?',
    project_title: 'Voices of the Crusades: A Live News Broadcast',
    project_description: `It is July 1099 CE. The Crusaders have just breached the walls of Jerusalem after a five-week siege. The city — under Muslim rule for over 400 years and home to Jewish residents for centuries — is in chaos.

Your task: produce a 3–5 minute live news broadcast covering the fall of Jerusalem from multiple perspectives simultaneously.

Your broadcast must include all three of the following on-the-ground interviews:

1. A CRUSADER KNIGHT — Interview a knight who has just entered the city.
2. A LOCAL MUSLIM SCHOLAR — Interview a scholar or resident who has lived in Jerusalem under Muslim rule.
3. A JEWISH RESIDENT OF JERUSALEM — Interview a Jewish person in the city at the moment of the conquest.

The news anchor introduces the broadcast, sets the historical scene, and closes with a 1–2 sentence reflection on what this moment reveals about what happens when cultures that see the world completely differently are forced to share the same space.

How to submit — choose one:
🎙️ Recorded broadcast — A 3–5 minute audio or video recording of the full news broadcast.
📝 Written transcript — A full written script of the broadcast, formatted as a news transcript.`,
    opening_message: `Three civilisations. One city. Everyone convinced God is on their side.

Jerusalem, 1099 CE. The Crusaders are at the walls. Inside: a Muslim population that has lived there for four centuries, and a Jewish community caught between two forces neither of which considers them allies.

Here's what I want to know before we start. When you think about two cultures clashing — does someone always have to lose? Or is that just the story we tell afterwards?`,
    plants: [
      {
        title: 'Judaism in the Christian Worldview: How the Medieval Church Saw Jews',
        label: 'Toleration',
        opening_message: `Here's a contradiction I need you to hold in your head, Traveler.

The medieval Church officially said Jews should be allowed to live and worship. Popes issued decrees protecting them. And at the same time — the same Church, the same era — mobs burned Jewish neighbourhoods while bishops looked the other way.

Both things were true simultaneously. I want you to come out of this understanding how that's possible.`,
        content: `The position of Jews in medieval Christian Europe was defined by a contradiction the Church never fully resolved.

On one hand, Jews were the people of the Hebrew Bible — the Old Testament that Christians also held sacred. Official Church policy stated that Jews must be permitted to live and worship — not forcibly converted, not killed.

On the other hand, Jews were, in mainstream Christian theology, the people who had rejected and killed Christ. This made them, in many Christians' eyes, not simply wrong, but actively guilty.

The result was a dual reality: official toleration and popular persecution existing side by side. Popes issued protective decrees. Mobs burned Jewish neighbourhoods.

Think about this: How is it possible for an institution to simultaneously protect a group and persecute them?`,
      },
      {
        title: 'The Foundations of Islam: Core Beliefs and Connections to Judaism and Christianity',
        label: 'Islam',
        opening_message: `Before this mission makes sense, you need to understand something that surprises most people.

Islam, Judaism, and Christianity don't just share some overlap — they share the same prophets. Abraham. Moses. Jesus. Islam sees them all as authentic, and Muhammad as the final one in that chain.

Here's what I want you to figure out while you're in here: if they share so much common ground, why did that shared foundation not prevent — and sometimes intensify — the conflicts between them?`,
        content: `Islam emerged in the Arabian Peninsula in the 7th century CE through the revelations received by the Prophet Muhammad beginning around 610 CE. These revelations were collected into the Quran — understood by Muslims as the direct, literal word of God.

The Five Pillars of Islam structure Muslim life: Shahada, Salah, Zakat, Sawm, and Hajj.

Central to understanding medieval inter-religious relations is how Islam understood itself in relation to Judaism and Christianity. Islam did not see itself as a completely new religion. It saw itself as the final and complete revelation in a continuous chain of prophecy that included Abraham, Moses, and Jesus. Jews and Christians were "People of the Book" (Ahl al-Kitab) — entitled to a protected (if subordinate) status within Islamic societies.

Think about this: Islam, Judaism, and Christianity all claim the same God and many of the same prophets. Why did sharing so much common theological ground not prevent — and sometimes even intensify — conflict between them?`,
      },
      {
        title: 'The Spread of Islam and the Concept of Jihad',
        label: 'Jihad',
        opening_message: `Traveler. One hundred years after Muhammad died, Islam had spread from Arabia to Spain, Persia, and the borders of India.

That is one of the fastest territorial expansions in human history. And it's also one of the most misread. The word you're going to encounter in here — Jihad — has been used and abused so much that almost nobody knows what it actually means in Islamic theology.

Go find out. Not the caricature. The real thing.`,
        content: `Within 100 years of Muhammad's death in 632 CE, Islam had spread from the Arabian Peninsula to Persia, across North Africa, into Spain, and to the borders of India and China.

The concept of Jihad is often misunderstood. In Islamic theology, it has multiple meanings. The "greater Jihad" is the internal spiritual struggle — the effort to live according to God's will and grow morally. The "lesser Jihad" refers to external struggle, including armed defence of the Muslim community when threatened.

The historical reality was mixed — neither purely peaceful conversion nor pure conquest, but a combination that varied enormously by time, place, and ruler.

Think about this: Religious expansion and political expansion were completely intertwined in the early Islamic world. Can you think of examples in other religious traditions where the same fusion occurred?`,
      },
      {
        title: 'Jews Under Islamic Rule: The Dhimmi System and the Pact of Umar',
        label: 'Dhimmi',
        opening_message: `Here's a question to carry into this one: can a system be both tolerant and discriminatory at the same time?

The Dhimmi system — the legal framework for Jewish and Christian life under Islamic rule — is one of history's clearest answers to that question. By the standards of medieval Christian Europe, it offered Jewish communities something remarkable. By modern standards, it was structured inequality.

Both of those things are true. Your job is to sit with that complexity.`,
        content: `When Muslim armies conquered new territories, they encountered large populations of Jews and Christians. Islamic law had a framework for what to do with them: the Dhimmi system.

Dhimmi (meaning "protected people") was a legal status granted to Jews and Christians living under Islamic rule. What Dhimmis received: protection of life and property, the right to practise their religion internally. What Dhimmis gave up: a special poll tax called the jizya, restrictions on building new houses of worship, and various rules marking them as subordinate.

By the standards of medieval Christendom, the Dhimmi system was relatively tolerant. Jewish poets, philosophers, and scientists flourished in Baghdad, Cairo, and Cordoba under Islamic rule.

Think about this: The Dhimmi system offered genuine protection alongside genuine discrimination. How do we evaluate a historical system that was, by the standards of its time, relatively tolerant?`,
      },
      {
        title: 'The Golden Age of Muslim Culture: Science, Philosophy, and Art',
        label: 'Baghdad',
        opening_message: `While much of Europe was trying not to collapse, something extraordinary was happening in Baghdad.

The Abbasid Caliphate built what might have been the greatest concentration of scholarship in the world at that time — translating Greek, Persian, and Indian knowledge into Arabic, and then pushing it further.

The thing I want you to find in here: the scientific knowledge that eventually powered the European Renaissance came largely through the Islamic world.`,
        content: `Between the 8th and 12th centuries, the Abbasid Caliphate based in Baghdad was experiencing one of the greatest intellectual flowerings in human history.

The Abbasid Caliphs established the House of Wisdom (Bayt al-Hikma) in Baghdad — an institution that functioned as library, translation bureau, and research centre simultaneously. Scholars were commissioned to translate every significant work of Greek, Persian, and Indian knowledge into Arabic.

The results were transformative: Al-Khwarizmi invented algebra. Ibn Sina (Avicenna) wrote a medical encyclopaedia used in European universities until the 17th century. Averroes (Ibn Rushd) wrote Aristotle commentaries that were more influential in Christian Europe than in the Islamic world.

Think about this: The scientific knowledge that eventually powered the European Renaissance largely came through the Islamic world. What does it mean that "Western civilisation" was built partly on work done in Baghdad?`,
      },
      {
        title: 'The Crusades: Origins, Conflict, and the Jewish Experience',
        label: 'Crusades',
        opening_message: `The Crusaders hadn't even reached the Middle East yet.

They were still in the Rhine Valley in Germany — on their way to Jerusalem — when they turned on Jewish communities in Worms, Mainz, and Cologne. Thousands killed.

This one is heavy, Traveler. But here's what I need you to think about: the people who did this believed they were doing something righteous. What do we do with the fact that sincere belief has been used to justify both the best and the worst things humans have ever done?`,
        content: `In 1095, Pope Urban II called on Christian knights to march to Jerusalem and liberate the Holy City from Muslim rule. Tens of thousands responded — knights, nobles, peasants, priests.

What happened before the Crusaders even reached the Middle East was shocking. In the spring of 1096, mobs swept through Jewish communities of the Rhine Valley in Germany. In Worms, Mainz, Cologne, and other cities, they gave Jewish communities a choice: convert to Christianity or die. Thousands were killed. These are known as the Rhineland Massacres.

When the Crusaders reached Jerusalem in 1099, they besieged it for five weeks and then stormed it. Jerusalem's Jewish community, which had gathered in a synagogue, was burned alive.

Think about this: The Crusaders believed they were doing God's work. The communities they massacred also believed they were living according to God's will. What do we do with that?`,
      },
      {
        title: 'The Crusader Kingdom of Jerusalem: Structure and Lasting Legacy',
        label: 'Jerusalem',
        opening_message: `Here's something that doesn't fit the simple narrative.

After the Crusaders conquered Jerusalem in 1099, they ruled it — and the surrounding territory — for nearly 200 years. A tiny European minority governing a region where they were surrounded by Muslim and Eastern Christian populations they had just fought. And during that time, they traded with them. Adopted their customs. Negotiated truces.

I want you to come out of this with one answer: does 200 years of complicated coexistence tell us something about what's possible?`,
        content: `After the conquest of Jerusalem in 1099, the Crusaders established a series of states along the eastern Mediterranean coast. The largest was the Kingdom of Jerusalem, which lasted nearly 200 years — until the fall of Acre in 1291.

During that time, Crusaders had to govern a territory where they were a small minority among a much larger Muslim and Eastern Christian population. The result was more complicated than simple conquest.

Crusaders adopted local customs, dress, foods, and medical practices. They negotiated truces and trading agreements with Muslim rulers. Italian merchant cities built trading networks connecting Europe to the Islamic world, carrying goods — and ideas — in both directions.

The lasting legacies of the Crusades were multiple and contradictory: deepened hostility between Christianity and Islam; intensified persecution of Jews in Europe; but also accelerated cultural exchange, revived long-distance trade, and the transmission of Islamic science and philosophy to Europe.

Think about this: The Crusader Kingdom lasted nearly 200 years. During that time, people from radically different cultures had to find ways to live in proximity. What does that tell us about what's possible — even between groups in active conflict?`,
      },
    ],
  },
];
