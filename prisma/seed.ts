import { PrismaClient, MissionStatus, ContentSource } from '@prisma/client'

// Seed script — Phase 1 Medieval History Journey
// All content is tagged source: HARDCODED.
// generationJobId is omitted (null) for all hardcoded content.
// sourceMaterials join table (PlantSource) is not populated — hardcoded plants
// have no GC source material.
//
// Phase 2: the AI generation pipeline will write Missions and Plants with
// source: AI_GENERATED and a generationJobId linking back to the GenerationJob.
//
// Before running against production, replace:
//   PLACEHOLDER_TEACHER_GOOGLE_ID  →  the real teacher's Google ID
//   PLACEHOLDER_GC_COURSE_ID       →  the real Google Classroom course ID

const prisma = new PrismaClient()

async function main() {

  // ── Teacher (seed user) ───────────────────────────────────────────────────
  const teacher = await prisma.user.upsert({
    where: { googleId: 'PLACEHOLDER_TEACHER_GOOGLE_ID' },
    update: {},
    create: {
      googleId: 'PLACEHOLDER_TEACHER_GOOGLE_ID',
      email: 'teacher@placeholder.com',
      name: 'Demo Teacher',
      role: 'teacher',
    },
  })

  // ── Journey ───────────────────────────────────────────────────────────────
  const journey = await prisma.journey.upsert({
    where: { googleCourseId: 'PLACEHOLDER_GC_COURSE_ID' },
    update: {},
    create: {
      googleCourseId: 'PLACEHOLDER_GC_COURSE_ID',
      title: 'History',
      teacherId: teacher.id,
      // lastMaterialSyncAt: null — no GC sync has run yet (Phase 2 feature)
    },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // MISSION 1
  // Big Question: Who owns the truth — the establishment or the individual?
  // Project: The Great Sovereignty Debate
  // ─────────────────────────────────────────────────────────────────────────
  const mission1 = await prisma.mission.upsert({
    where: { id: 'seed-mission-1' },
    update: {},
    create: {
      id: 'seed-mission-1',
      journeyId: journey.id,
      order: 1,
      status: MissionStatus.INACTIVE,
      source: ContentSource.HARDCODED,
      // generationJobId: null — hardcoded content has no generation job
      createdBy: teacher.id,

      question: 'Who owns the truth — the establishment or the individual?',

      openingMessage:
`Traveler. My scanners are picking up something unusual.

Two of the most powerful forces in the known world — both claiming to own the truth. At the same time. The Pope says God speaks through him. The Emperor says God speaks through him. Both of them. Simultaneously. And neither is bluffing.

Before we go deeper — I need your first instinct: is it even possible for two people to each be completely right, when their answers are total opposites?`,

      questionDescription:
        'In the Middle Ages, "truth" was not a personal opinion — it was an official position, guarded and declared by powerful institutions. The Church decided what was spiritually true. The Emperor decided what was politically true. Jewish communities built their own parallel systems of truth to survive in exile. This Mission asks: when powerful institutions control what counts as real and legitimate, what room is left for the individual? And what happens when two institutions both claim the same authority?',

      projectTitle: 'The Great Sovereignty Debate',

      projectDescription:
`You are a delegate attending a special council in the year 1076 CE — the height of the Investiture Controversy, the moment when Pope Gregory VII and Holy Roman Emperor Henry IV are locked in open conflict over who has the ultimate right to appoint Church officials, and by extension, who rules God's world on earth.

You have been assigned a side:

TEAM POPE — You represent the Papal position. Your argument: the Pope holds the "Keys to Heaven." All earthly authority flows from God, and God speaks through the Church. No emperor can claim to rule without the Pope's blessing.

TEAM EMPEROR — You represent the Imperial position. Your argument: the Emperor wields "The Sword." Rulers receive their authority directly from God to maintain order on earth. The Church should tend to souls — not thrones.

Your task: Build an argument defending your side's claim to be the ultimate source of truth and order on earth. Your argument must:

1. State your position clearly and explain the theological or political logic behind it.
2. Include at least two pieces of evidence drawn from the Plants in this Mission.
3. Anticipate and directly respond to at least one argument the opposing side is likely to make.
4. Close with a statement about why, if your side loses, the consequences would be catastrophic for the world.

This debate is not about winning. It is about understanding how two entirely different worldviews about authority — one based on spiritual legitimacy, the other on political order — could exist simultaneously, clash violently, and yet both feel completely reasonable to the people who held them.

How to submit — choose one:
📝 Written argument — A structured 2–3 page written speech in your character's voice, as if you are about to deliver it to the council.
🎙️ Recorded argument — A 3–5 minute audio or video recording of you delivering the argument in character.`,
    },
  })

  // Mission 1 — Plant 1
  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-1' },
    update: {},
    create: {
      id: 'seed-plant-1-1',
      missionId: mission1.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Central Role of the Catholic Church in Medieval Society',
      openingMessage:
`Traveler. Before you go in — I need you to understand the scale of what you're scanning.

This isn't just about religion. The Church ran the hospitals. The schools. The courts. The calendar. If you were born in medieval Europe, the Church was involved in literally every major moment of your life — from baptism to burial.

Here's what I want you to figure out while you're in there: what would it actually cost an ordinary person to disagree with an institution that controlled all of that?`,
      content:
`In the Middle Ages, the Catholic Church was not simply a place of worship — it was the backbone of European society. The Church ran hospitals, schools, and courts. It collected taxes. It governed the calendar. From birth (baptism) to death (last rites), no major life event happened outside the Church's authority.

At the top sat the Pope in Rome. Below him, a vast network of archbishops, bishops, and parish priests reached into every village in Europe. The Church owned roughly one third of all land in Western Europe. It was, in modern terms, both the government and the media — the institution that told people what was true, what was right, and what would happen to them after they died.

The Church's most powerful weapon was excommunication — the formal removal of a person from the Christian community. An excommunicated person could not receive the sacraments, could not be buried in consecrated ground, and was effectively expelled from society. For a medieval king, excommunication was politically catastrophic: it released his subjects from their oath of loyalty to him.

In a world with no newspapers, no internet, and low literacy, the Church controlled what ideas people had access to. Monks copied and preserved manuscripts. Church schools educated the elite. Sermons were how most people learned anything about the wider world.

Think about this: If the Church controlled education, law, spiritual salvation, and access to the afterlife — was it really possible for an ordinary person to disagree with it? What would disagreement actually cost them?`,
    },
  })

  // Mission 1 — Plant 2
  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-2' },
    update: {},
    create: {
      id: 'seed-plant-1-2',
      missionId: mission1.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Pope vs. The Emperor: The Investiture Controversy',
      openingMessage:
`A sitting Pope excommunicated a Holy Roman Emperor.

The Emperor — one of the most powerful men in the world — ended up standing barefoot in the snow outside a castle for three days, begging forgiveness. It actually happened. 1077 CE.

What I want you to find out: how does someone with that much power end up in that position? And what does it tell us about who was really in charge?`,
      content:
`In 1076, Pope Gregory VII did something that had never been done before: he excommunicated a sitting Holy Roman Emperor, Henry IV.

The cause was a dispute called the Investiture Controversy — a conflict over who had the right to "invest" (appoint) bishops and abbots. This sounds like a minor administrative question. It was anything but. Bishops controlled land, armies, and wealth. Whoever appointed them effectively controlled the most powerful institutions in medieval Europe. The Pope said: only the Church appoints Church officials. The Emperor said: these men are also my vassals — I need to appoint loyal ones.

Henry IV's response to excommunication was defiance — at first. But his nobles, now freed from their oaths of loyalty by the Pope's decree, began to rebel. Henry had no choice. In January 1077, he walked barefoot through the snow to the castle of Canossa in northern Italy, where Gregory was staying, and stood outside for three days in penitent's clothing, begging forgiveness. Gregory, obligated as a priest to grant absolution to a repentant sinner, let him back in.

It was one of the most humiliating moments in the history of European monarchy — and one of the most dramatic demonstrations of Papal power ever recorded.

The conflict was never fully resolved. A compromise, the Concordat of Worms (1122), split the difference: the Church would appoint bishops spiritually, the Emperor would invest them with temporal lands. But the underlying tension — who has ultimate authority on earth — persisted for centuries.

Think about this: Both the Pope and the Emperor believed they were defending God's order on earth. How do we make sense of a conflict where both sides think they are right — and both sides have real power to back that claim?`,
    },
  })

  // Mission 1 — Plant 3
  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-3' },
    update: {},
    create: {
      id: 'seed-plant-1-3',
      missionId: mission1.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Jewish Community in Ashkenaz: Rabbenu Gershom and Rashi',
      openingMessage:
`Here's something that doesn't add up at first, Traveler.

A community with no army, no castle, and no political power in the Christian world — and yet they built a system of law and leadership that lasted a thousand years and is still in use today.

I want you to come out of this one with an answer to this: what makes authority real, if it's not backed by force?`,
      content:
`While the Pope and Emperor fought over who controlled Christian Europe, Jewish communities across Northern France and Germany — collectively known as Ashkenaz — were building a parallel world with its own laws, courts, and leaders.

Jewish communities in Ashkenaz had no armies, no castles, and no political power in the Christian sense. What they had was scholarship. The great rabbis of this era created the legal and intellectual frameworks that would define Jewish life in Europe for centuries.

Rabbenu Gershom (c. 960–1028), known as the "Light of the Exile," convened rabbinical councils that established binding communal rules for all Ashkenazic Jews. His rulings included the prohibition on polygamy and an early recognition of privacy as a value — he ruled it forbidden to read another person's mail.

Rashi (Rabbi Solomon ben Isaac, 1040–1105), who lived in Troyes, France, wrote commentaries on the Torah and Talmud so clear and comprehensive that they are still printed alongside the original texts today, nearly a thousand years later. Rashi wrote for ordinary readers, not just scholars. His goal was to make the Jewish textual tradition accessible to everyone — an act of cultural preservation in a world that threatened Jewish existence at every turn.

Think about this: How did Jewish communities maintain their own system of law, their own definition of truth, and their own leadership — while living entirely inside a society with completely different answers to those same questions? What made that kind of internal authority legitimate to the people who followed it?`,
    },
  })

  // Mission 1 — Plant 4
  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-4' },
    update: {},
    create: {
      id: 'seed-plant-1-4',
      missionId: mission1.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Geonim of Babylonia: Jewish Leadership in Exile',
      openingMessage:
`The Jewish people had no homeland, no Temple, and no king.

And yet, from academies in Babylonia — modern-day Iraq — they ran a legal system that served Jewish communities from Spain to Persia. People wrote questions. They wrote back. And communities across the world treated those answers as binding law.

How? That's the question. Go find out what made that kind of authority work — with nothing behind it except reputation and trust.`,
      content:
`Centuries before Rashi was born, the centre of Jewish intellectual life was not in Europe at all — it was in Babylonia (modern-day Iraq), in the academies of Sura and Pumbedita.

After the destruction of the Second Temple in 70 CE, the Jewish people had no homeland, no Temple, and no king. But they built something remarkable in its place: a transnational system of legal authority based entirely on scholarship and voluntary acceptance.

The leaders of the Babylonian academies, known as Geonim, served as the supreme legal authorities for Jewish communities across the known world — from Spain to Persia to North Africa. Jews who had a legal question they couldn't resolve locally would write to the Gaon. The Gaon would respond in writing, and the response carried the authority of a court ruling.

This system worked without an army, without a police force, and without any political power. Its authority rested entirely on reputation, scholarship, and the voluntary trust of the communities that used it.

The most famous Gaon was Saadia Gaon (882–942), who engaged directly with Arabic philosophy — the dominant intellectual tradition of the Islamic world around him — to explain and defend Jewish theology in rational terms. He wrote in Arabic as well as Hebrew, making Jewish ideas accessible to educated people across cultural lines.

Think about this: The Geonim created a system of authority that worked without a homeland, a Temple, or political power. What made that kind of authority legitimate to the people who accepted it — and what does that tell us about what makes any authority legitimate?`,
    },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // MISSION 2
  // Big Question: Is personal security worth the loss of freedom?
  // Project: The Feudal Terms of Service
  // ─────────────────────────────────────────────────────────────────────────
  const mission2 = await prisma.mission.upsert({
    where: { id: 'seed-mission-2' },
    update: {},
    create: {
      id: 'seed-mission-2',
      journeyId: journey.id,
      order: 2,
      status: MissionStatus.INACTIVE,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,

      question: 'Is personal security worth the loss of freedom?',

      openingMessage:
`Traveler — I need you to picture something.

No police. No army. No government to call. Raiders could arrive in your village tonight, and no one is coming to help. That's not a hypothetical. For most people in medieval Europe, that was just a Tuesday.

The question your mission is asking — how much freedom would you trade for safety — was the most important question of their lives. So I'll ask you first: what would you give up? And what would you refuse to give up, no matter what?`,

      questionDescription:
        'After the fall of the Roman Empire, Europe descended into a world with no stable government, no reliable army, and no guaranteed safety. In response, people made a deal: give up your freedom in exchange for protection. This is the Feudal Bargain — and for hundreds of years, it shaped every aspect of daily life, from who owned the land to who could marry whom. This Mission asks: when the world feels dangerous and chaotic, how much freedom are people willing to trade away for security? And what happens when that bargain starts to look less like protection and more like control?',

      projectTitle: 'The Feudal Terms of Service',

      projectDescription:
`Every app you use has a Terms of Service — a legal agreement you accept in exchange for access to something you want. Usually, nobody reads it. But what if the terms were your entire life?

Your task is to draft a Feudal Terms of Service — a modern-style agreement that a serf or vassal must agree to in order to receive protection and land from their lord. Write it as if it were a real digital product agreement, but make the content historically accurate to medieval feudal society.

Your document must include all five of the following sections:

1. WHAT YOU ARE AGREEING TO RECEIVE — List the specific protections, resources, and rights the lord provides. Be specific and historically grounded.

2. WHAT YOU AGREE TO GIVE UP — List the specific freedoms and obligations surrendered. This section should be the longest — and should feel uncomfortable.

3. CONSEQUENCES OF BREACH — What happens if either party fails to meet their obligations? What recourse does a vassal have if their lord fails to protect them?

4. ARBITRATION CLAUSE — Who settles disputes? The Church? The King? A higher lord? Who has authority, and what does that reveal about where real power sits in this system?

5. WHY I AGREED: A PERSONAL STATEMENT — Written in the first-person voice of the serf or vassal. One paragraph explaining why, given the realities of their world, this bargain felt like the only rational choice — even knowing what they were giving up.

Minimum length: 2 pages, or the equivalent in your chosen format.

Feudalism often gets taught as a system imposed on powerless people by powerful lords. The historical reality is more complicated — for many people, at many moments, giving up freedom in exchange for security was a survival decision that made complete sense. Understanding that is not the same as approving of it. This project asks you to understand the logic from the inside.

How to submit — choose one:
📝 Written document — The full Terms of Service as a formatted text document with all five sections.
🎙️ Recorded walkthrough — A 3–5 minute audio or video recording of you presenting and explaining the key terms, as if briefing a serf who is about to sign. Must cover all five sections.
🎨 Illustrated contract — A visual document combining art and text to bring the contract to life. Must include all five required sections.`,
    },
  })

  // Mission 2 — Plant 1
  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-1' },
    update: {},
    create: {
      id: 'seed-plant-2-1',
      missionId: mission2.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Fall of Rome and the Conditions That Created Feudalism',
      openingMessage:
`Rome didn't fall on a single day, Traveler. It unravelled.

And what went with it wasn't just an emperor or a capital city. It was roads, law, a professional army — the entire infrastructure that made safety possible. When that collapsed, there was no emergency number to call. There was no state.

I want you to come out of this one with a clear picture of what it actually felt like to live in that vacuum. Because the bargain people made next only makes sense if you feel the fear first.`,
      content:
`In 476 CE, the last Roman Emperor in the West was deposed by a Germanic chieftain. But Rome hadn't really "fallen" on that day — it had been unravelling for centuries.

What Rome provided, at its peak, was infrastructure: roads, law, a professional army, a stable currency, and a government that could resolve disputes and enforce agreements across a vast territory. When that infrastructure collapsed, so did safety.

What followed was not a single catastrophe but a slow unwinding. Roads fell into disrepair. Trade collapsed. Cities shrank. The population declined. And most terrifying: no one was coming to protect you.

Viking raids struck coastal communities from Ireland to Russia. Magyar horsemen raided deep into Central Europe. Saracen pirates controlled the Mediterranean coastlines. There was no emergency number to call. There was no army funded by your taxes. There was no court to hear your complaint. If raiders came, you either had walls, a protector, or you were on your own.

Feudalism was not invented by a philosopher or decreed by a king. It emerged organically from this environment of fear. Local strongmen — men with horses, weapons, and walls — began offering protection in exchange for labour and loyalty. People accepted, because the alternative was worse.

Think about this: If there were no police, no army, and no government — and raiders could arrive at any time — what would you be willing to agree to in exchange for safety? What would you not give up, even then?`,
    },
  })

  // Mission 2 — Plant 2
  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-2' },
    update: {},
    create: {
      id: 'seed-plant-2-2',
      missionId: mission2.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Feudal Hierarchy: Kings, Nobles, Vassals, and Serfs',
      openingMessage:
`You've probably seen the pyramid diagram. King at the top, peasants at the bottom. Forget it for a second.

Feudalism wasn't really a pyramid. It was a web of personal promises — each one individually sworn, each one binding. Every level had obligations running in both directions. Break your oath and you weren't just breaking a rule — you were breaking a sacred bond.

Here's what I want you to figure out: where in this web would you actually want to be — and what would you have to give up to get there?`,
      content:
`Feudalism is often drawn as a pyramid — king at the top, nobles below, knights below them, peasants at the base. The pyramid is useful but misleading. Feudalism was less like a corporation with a clear chain of command and more like a web of personal promises, each individually negotiated, each binding only to the specific people who made it.

The core of feudalism was the oath of homage and fealty. A vassal knelt before a lord, placed his hands between the lord's, and swore an oath of loyalty. In return, the lord granted the vassal a fief — usually land — and the right to defend it. This ceremony was a legal contract. Breaking it was not just a political act; it was a moral betrayal.

But the king was not automatically at the top of every chain. A great noble might owe homage to the king — but he also had dozens of lesser vassals who owed homage to him. Each link in the chain was personal. A king could not simply order a baron's vassal to do something; he had no direct relationship with him.

At the bottom sat the serfs — who were different from vassals in a crucial way. A vassal entered his relationship by choice (at least in theory). A serf was bound to the land itself, not to a person. If the land was sold, the serf came with it. Serfs could not leave the manor without the lord's permission. They could not marry without approval. They could not own the land they worked.

Think about this: Every level of this hierarchy had obligations running in both directions — protection and service flowing upward and downward simultaneously. Where in this pyramid would you rather have been? What would you be willing to give up to move one level higher?`,
    },
  })

  // Mission 2 — Plant 3
  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-3' },
    update: {},
    create: {
      id: 'seed-plant-2-3',
      missionId: mission2.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Three Orders: Those Who Pray, Those Who Fight, Those Who Work',
      openingMessage:
`Every society tells itself a story about why things are the way they are.

Medieval Europe's story was this: God designed three kinds of people — those who pray, those who fight, and those who work. Each has its role. Each is sacred. Accepting your place in that system isn't just a social norm — it's a religious duty.

I need you to think about something while you're reading this: who benefits most from that particular story? And is that a coincidence?`,
      content:
`Medieval society had a story it told about itself — and that story was very convenient for the people at the top.

In the 10th century, a bishop named Adalbero of Laon articulated what became the dominant ideological framework of medieval Europe: God had divided humanity into three orders. Those who pray (oratores) — the clergy, who interceded with God on behalf of everyone else. Those who fight (bellatores) — the knights and nobles, who protected society from violence. Those who work (laboratores) — the peasants, who fed everyone else.

Each order had its God-given role. Each was essential. Each depended on the others. Accepting your place in this system was not just a social norm — it was a religious obligation. To question the hierarchy was to question God's design.

Notice what this ideology accomplished: it made the suffering of the laborers sacred. It made the wealth of the nobles divinely ordained. It made any challenge to the system not just illegal but sinful.

This is a pattern worth recognising. Throughout history, dominant groups have often used religious, scientific, or philosophical frameworks to explain why the existing hierarchy is natural, inevitable, or divinely ordained. Medieval feudalism is one of history's clearest examples of this pattern at work.

Think about this: When a social hierarchy is described as God's design, what effect does that have on people's ability — or willingness — to question it? Is ideology more effective as a tool of control than physical force? Why or why not?`,
    },
  })

  // Mission 2 — Plant 4
  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-4' },
    update: {},
    create: {
      id: 'seed-plant-2-4',
      missionId: mission2.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'Daily Life in Feudal Society',
      openingMessage:
`We've been talking about systems and hierarchies. Now let's talk about a person.

Someone who was born on a manor, works the same fields their parents worked, owes the lord a portion of every harvest, and cannot leave without permission. Not as a prisoner — as a serf. That was a legal category. A normal life.

What I want you to find in here is the texture of that life — not just the obligations, but what it actually felt like day to day. Was the Feudal Bargain fair to this person? You decide.`,
      content:
`The manor was the basic unit of feudal life — a self-contained world of fields, a mill, a church, workshops, and the lord's hall or castle. Most people who lived on a manor were born, lived, and died there without ever travelling more than a few miles.

For a serf, the agricultural year was relentless. Spring: ploughing and planting. Summer: tending crops, repairing tools and buildings. Autumn: harvest, followed immediately by preparation for winter. Winter: the hunger months, living off what had been stored, praying the stores lasted until spring. A bad harvest could mean starvation.

Serfs owed the lord labour service — typically working the lord's fields several days per week before they could tend their own. They paid fees in grain for use of the lord's mill (the only place to grind grain into flour), fees for marriages, fees for inheriting their parents' land. The lord had the right to demand extraordinary payments at will.

But feudal life was not purely grim. The lord's walls offered refuge during raids. The lord's granary could provide emergency food in a famine. The community of the village — celebrations, festivals, shared labour during harvest — gave peasant life texture and meaning.

The reality was that feudalism was neither pure exploitation nor genuine partnership. It was an unequal bargain, entered under duress, that nonetheless provided real (if limited) benefits to both sides.

Think about this: Based on what you've learned about daily life, was the Feudal Bargain a fair deal? Would your answer be different depending on which level of society you were born into?`,
    },
  })

  // Mission 2 — Plant 5
  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-5' },
    update: {},
    create: {
      id: 'seed-plant-2-5',
      missionId: mission2.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Rise of Cities and Urban Autonomy: Guilds and Universities',
      openingMessage:
`Feudalism had a plan for three kinds of people: clergy, nobles, peasants.

Then a fourth kind appeared. Merchants. Craftspeople. Scholars. People who didn't fit any of the three categories — and who were quietly accumulating wealth and influence the system hadn't anticipated.

Here's your mission going in: find out what kind of bargain city life offered — and whether it was actually better than the feudal one, or just a different set of trade-offs.`,
      content:
`Feudalism assumed that everyone fit into one of three categories: clergy, noble, or peasant. But beginning in the 10th and 11th centuries, a new kind of person appeared in Europe — and the feudal system had no place for them.

Merchants. Craftspeople. Moneylenders. Lawyers. Scholars. People who were neither peasants tied to the land, nor knights sworn to a lord, nor clergy sworn to the Church. As long-distance trade revived, these people accumulated wealth and influence that the feudal hierarchy hadn't anticipated.

They gathered in towns — at river crossings, harbour mouths, or the gates of monasteries. And they built their own institutions.

Guilds were associations of craftspeople or merchants in the same trade that set quality standards, trained apprentices, and provided mutual support. Joining a guild meant entering a new kind of social contract: pay dues, meet standards, compete fairly, support your fellow members. In exchange: access to a trade, protection from outside competition, and community.

Universities emerged in Bologna, Paris, and Oxford in the 11th and 12th centuries — institutions outside the direct control of any lord or bishop. Scholars from across Europe gathered to argue about ideas in a way the feudal world had not really permitted.

Charter towns — communes — negotiated formal agreements with kings or lords that granted self-governance in exchange for taxes. A person could move to a town, live there for a year and a day, and be legally free of serfdom.

Think about this: Cities offered a different kind of bargain from the feudal one. What made the urban bargain attractive? What did people gain — and what new things did they give up in exchange?`,
    },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // MISSION 3
  // Big Question: Must an encounter between different cultures always end in the victory of one side?
  // Project: Voices of the Crusades — A Live News Broadcast
  // ─────────────────────────────────────────────────────────────────────────
  const mission3 = await prisma.mission.upsert({
    where: { id: 'seed-mission-3' },
    update: {},
    create: {
      id: 'seed-mission-3',
      journeyId: journey.id,
      order: 3,
      status: MissionStatus.INACTIVE,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,

      question: 'Must an encounter between different cultures always end in the victory of one side?',

      openingMessage:
`Three civilisations. One city. Everyone convinced God is on their side.

Jerusalem, 1099 CE. The Crusaders are at the walls. Inside: a Muslim population that has lived there for four centuries, and a Jewish community caught between two forces neither of which considers them allies.

Here's what I want to know before we start. When you think about two cultures clashing — does someone always have to lose? Or is that just the story we tell afterwards?`,

      questionDescription:
        'Between the 7th and 13th centuries, Christianity, Islam, and Judaism were not isolated from each other — they collided, competed, traded, translated, and sometimes even collaborated. The Crusades are the most famous collision, but they are only one part of a much larger story. This Mission asks: when civilisations meet, does someone always have to win? Or is it possible for cultures to transform each other — to exchange ideas, lose things, gain things, and emerge as something new — without one side conquering the other?',

      projectTitle: 'Voices of the Crusades: A Live News Broadcast',

      projectDescription:
`It is July 1099 CE. The Crusaders have just breached the walls of Jerusalem after a five-week siege. The city — under Muslim rule for over 400 years and home to Jewish residents for centuries — is in chaos.

Your task: produce a 3–5 minute live news broadcast covering the fall of Jerusalem from multiple perspectives simultaneously.

Your broadcast must include all three of the following on-the-ground interviews:

1. A CRUSADER KNIGHT — Interview a knight who has just entered the city. He should explain why he came (the Pope's call, the concept of Holy War, personal religious motivation), what this moment means to him, and how he understands the violence around him. His account should reflect genuine medieval Christian belief — not a caricature.

2. A LOCAL MUSLIM SCHOLAR — Interview a scholar or resident who has lived in Jerusalem under Muslim rule. He should describe what the city has meant to Muslims, what the Crusader arrival looks like from inside the walls, and how he understands this in terms of Islamic faith. His account should draw from what you've learned about Islamic beliefs and culture.

3. A JEWISH RESIDENT OF JERUSALEM — Interview a Jewish person in the city at the moment of the conquest. He or she should describe the specific treatment of the Jewish community by the Crusaders, how this connects to a longer history of Jewish experience in the region, and what it means to be a minority caught between two warring powers.

The news anchor introduces the broadcast, sets the historical scene, and closes with a 1–2 sentence reflection on what this moment reveals about what happens when cultures that see the world completely differently are forced to share the same space.

Each interviewee must draw from at least one Plant in this Mission. The interviews should contain specific historical details, names, dates, and concepts.

This is not a project about who was right. The goal is to practise the most important skill in historical thinking: genuinely inhabiting a perspective that is not your own, understanding it from the inside, and representing it with accuracy and respect.

How to submit — choose one:
🎙️ Recorded broadcast — A 3–5 minute audio or video recording of the full news broadcast, with all three interviews performed in character.
📝 Written transcript — A full written script of the broadcast, formatted as a news transcript, with all three interviews written in character.`,
    },
  })

  // Mission 3 — Plant 1
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-1' },
    update: {},
    create: {
      id: 'seed-plant-3-1',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'Judaism in the Christian Worldview: How the Medieval Church Saw Jews',
      openingMessage:
`Here's a contradiction I need you to hold in your head, Traveler.

The medieval Church officially said Jews should be allowed to live and worship. Popes issued decrees protecting them. And at the same time — the same Church, the same era — mobs burned Jewish neighbourhoods while bishops looked the other way.

Both things were true simultaneously. I want you to come out of this understanding how that's possible — because the same gap between official policy and social reality shows up a lot in history, and in the present.`,
      content:
`The position of Jews in medieval Christian Europe was defined by a contradiction the Church never fully resolved.

On one hand, Jews were the people of the Hebrew Bible — the Old Testament that Christians also held sacred. The prophets, the patriarchs, the history of God's chosen people were Jewish history. Official Church policy stated that Jews must be permitted to live and worship — not forcibly converted, not killed.

On the other hand, Jews were, in mainstream Christian theology, the people who had rejected and killed Christ. This made them, in many Christians' eyes, not simply wrong, but actively guilty — a guilt later generations inherited. Jews were associated in popular Christian imagination with conspiracy and danger.

The result was a dual reality: official toleration and popular persecution existing side by side. Popes issued protective decrees. Mobs burned Jewish neighbourhoods. Bishops protected local Jewish communities. Kings expelled them. Blood libel accusations — the fabricated claim that Jews murdered Christian children for religious rituals — swept through Europe periodically, triggering massacres.

Jewish communities navigated this contradiction by necessity: legal appeals, communal self-reliance, and cultivating relationships with individual powerful Christians who offered protection.

Think about this: How is it possible for an institution to simultaneously protect a group and persecute them? What does that tell us about the difference between official policy and social reality — and do we see similar contradictions today?`,
    },
  })

  // Mission 3 — Plant 2
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-2' },
    update: {},
    create: {
      id: 'seed-plant-3-2',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Foundations of Islam: Core Beliefs and Connections to Judaism and Christianity',
      openingMessage:
`Before this mission makes sense, you need to understand something that surprises most people.

Islam, Judaism, and Christianity don't just share some overlap — they share the same prophets. Abraham. Moses. Jesus. Islam sees them all as authentic, and Muhammad as the final one in that chain. From inside Islam, it isn't a completely different religion. It's the completed version of the same one.

Here's what I want you to figure out while you're in here: if they share so much common ground, why did that shared foundation not prevent — and sometimes intensify — the conflicts between them?`,
      content:
`Islam emerged in the Arabian Peninsula in the 7th century CE through the revelations received by the Prophet Muhammad beginning around 610 CE. These revelations were collected into the Quran — understood by Muslims as the direct, literal word of God (Allah).

The Five Pillars of Islam structure Muslim life: Shahada (the declaration of faith — "There is no god but God, and Muhammad is his messenger"), Salah (prayer five times daily), Zakat (charitable giving), Sawm (fasting during Ramadan), and Hajj (pilgrimage to Mecca, for those able).

Central to understanding medieval inter-religious relations is how Islam understood itself in relation to Judaism and Christianity. Islam did not see itself as a completely new religion. It saw itself as the final and complete revelation in a continuous chain of prophecy that included Abraham, Moses, and Jesus. In this view, Jews and Christians had received authentic revelations — but had corrupted or misunderstood them over time.

This theology had direct political consequences. Jews and Christians were "People of the Book" (Ahl al-Kitab) — entitled to a protected (if subordinate) status within Islamic societies.

Think about this: Islam, Judaism, and Christianity all claim the same God and many of the same prophets. Why did sharing so much common theological ground not prevent — and sometimes even intensify — conflict between them?`,
    },
  })

  // Mission 3 — Plant 3
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-3' },
    update: {},
    create: {
      id: 'seed-plant-3-3',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Spread of Islam and the Concept of Jihad',
      openingMessage:
`Traveler. One hundred years after Muhammad died, Islam had spread from Arabia to Spain, Persia, and the borders of India.

That is one of the fastest territorial expansions in human history. And it's also one of the most misread. The word you're going to encounter in here — Jihad — has been used and abused so much that almost nobody knows what it actually means in Islamic theology.

Go find out. Not the caricature. The real thing. Then tell me what surprised you.`,
      content:
`Within 100 years of Muhammad's death in 632 CE, Islam had spread from the Arabian Peninsula to Persia, across North Africa, into Spain, and to the borders of India and China. This is one of the most rapid territorial expansions in human history.

The expansion was both military and missionary — and the two were intertwined. Muslim armies conquered new territories. But many people in those territories converted voluntarily over the following centuries, attracted by the message, the community, and the relatively sophisticated urban culture of the early Islamic world.

The concept of Jihad is often misunderstood. In Islamic theology, it has multiple meanings. The "greater Jihad" is the internal spiritual struggle — the effort to live according to God's will and grow morally. The "lesser Jihad" refers to external struggle, including armed defence of the Muslim community when threatened. The expansion of the realm of Islam was framed by early Islamic scholars as a religious obligation — but with rules: non-combatants were to be protected, treaties honoured, and conquered peoples who surrendered peacefully were to receive protected status.

The historical reality was mixed — neither purely peaceful conversion nor pure conquest, but a combination that varied enormously by time, place, and ruler.

Think about this: Religious expansion and political expansion were completely intertwined in the early Islamic world. Is that surprising? Can you think of examples in other religious traditions where the same fusion occurred?`,
    },
  })

  // Mission 3 — Plant 4
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-4' },
    update: {},
    create: {
      id: 'seed-plant-3-4',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'Jews Under Islamic Rule: The Dhimmi System and the Pact of Umar',
      openingMessage:
`Here's a question to carry into this one: can a system be both tolerant and discriminatory at the same time?

The Dhimmi system — the legal framework for Jewish and Christian life under Islamic rule — is one of history's clearest answers to that question. By the standards of medieval Christian Europe, it offered Jewish communities something remarkable. By modern standards, it was structured inequality.

Both of those things are true. Your job is to sit with that complexity — not resolve it, just understand it.`,
      content:
`When Muslim armies conquered new territories, they encountered large populations of Jews and Christians. Islamic law had a framework for what to do with them: the Dhimmi system.

Dhimmi (meaning "protected people") was a legal status granted to Jews and Christians living under Islamic rule. The Pact of Umar set out the terms.

What Dhimmis received: protection of life and property, the right to practise their religion internally, the right to maintain their own courts for internal community matters, and freedom from forced conversion.

What Dhimmis gave up: a special poll tax called the jizya (paid in lieu of military service), restrictions on building new houses of worship, requirements to defer to Muslims in public spaces, and various rules marking them as subordinate.

By the standards of medieval Christendom, the Dhimmi system was relatively tolerant. Jews in Islamic lands — particularly in Al-Andalus (Islamic Spain) — often enjoyed greater economic freedom, safety, and intellectual life than their counterparts in Christian Europe. Jewish poets, philosophers, and scientists flourished in Baghdad, Cairo, and Cordoba under Islamic rule.

But the system was still one of structured inequality. Dhimmis were second-class subjects, legally and socially subordinate. The protection was real — and so was the discrimination.

Think about this: The Dhimmi system offered genuine protection alongside genuine discrimination. How do we evaluate a historical system that was, by the standards of its time, relatively tolerant — but would be unacceptable today? Does historical context change our judgment?`,
    },
  })

  // Mission 3 — Plant 5
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-5' },
    update: {},
    create: {
      id: 'seed-plant-3-5',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Golden Age of Muslim Culture: Science, Philosophy, and Art',
      openingMessage:
`While much of Europe was trying not to collapse, something extraordinary was happening in Baghdad.

The Abbasid Caliphate built what might have been the greatest concentration of scholarship in the world at that time — translating Greek, Persian, and Indian knowledge into Arabic, and then pushing it further. Muslim, Jewish, and Christian scholars working in the same building on the same problems.

The thing I want you to find in here: the scientific knowledge that eventually powered the European Renaissance came largely through the Islamic world. What does that do to the idea of "Western" vs "Islamic" as opposites?`,
      content:
`Between the 8th and 12th centuries, while much of Europe was struggling to hold its civilisation together, the Abbasid Caliphate based in Baghdad was experiencing one of the greatest intellectual flowerings in human history.

The Abbasid Caliphs established the House of Wisdom (Bayt al-Hikma) in Baghdad — an institution that functioned as library, translation bureau, and research centre simultaneously. Scholars were commissioned to translate every significant work of Greek, Persian, and Indian knowledge into Arabic. Plato, Aristotle, Galen, Euclid, Ptolemy — all were translated, studied, commented on, and extended.

The scholars who did this work were not all Muslim. Jewish, Christian, and Zoroastrian scholars worked alongside Muslim colleagues in the same institutions, on the same projects.

The results were transformative: Al-Khwarizmi invented algebra. Ibn Sina (Avicenna) wrote a medical encyclopaedia used in European universities until the 17th century. Averroes (Ibn Rushd) wrote Aristotle commentaries that were more influential in Christian Europe than in the Islamic world.

When the Crusaders arrived in the Middle East, they encountered a civilisation more sophisticated than their own in medicine, mathematics, architecture, and philosophy.

Think about this: The scientific knowledge that eventually powered the European Renaissance largely came through the Islamic world. What does it mean that "Western civilisation" was built partly on work done in Baghdad? Does it change how you think about the concept of "Western" vs "Islamic" culture?`,
    },
  })

  // Mission 3 — Plant 6
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-6' },
    update: {},
    create: {
      id: 'seed-plant-3-6',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Crusades: Origins, Conflict, and the Jewish Experience',
      openingMessage:
`The Crusaders hadn't even reached the Middle East yet.

They were still in the Rhine Valley in Germany — on their way to Jerusalem — when they turned on Jewish communities in Worms, Mainz, and Cologne. Thousands killed. The reasoning, in a horrifying way, made internal sense to them: why travel thousands of miles to fight enemies of Christ when his enemies were right here?

This one is heavy, Traveler. But here's what I need you to think about: the people who did this believed they were doing something righteous. What do we do with the fact that sincere belief has been used to justify both the best and the worst things humans have ever done?`,
      content:
`In 1095, Pope Urban II stood before a crowd at Clermont, France, and called on Christian knights to march to Jerusalem and liberate the Holy City from Muslim rule. Tens of thousands responded — knights, nobles, peasants, priests — driven by religious devotion, the promise of papal indulgence, and the lure of land.

What happened before the Crusaders even reached the Middle East was shocking. In the spring of 1096, disorganised mobs inspired by preachers swept through Jewish communities of the Rhine Valley in Germany. In Worms, Mainz, Cologne, and other cities, they gave Jewish communities a choice: convert to Christianity or die. Thousands were killed. Some entire communities chose martyrdom together rather than conversion. These are known as the Rhineland Massacres.

The reasoning of the mob was, in a horrifying way, internally coherent: why march thousands of miles to fight the enemies of Christ in Jerusalem when his enemies were right here at home?

When the Crusaders reached Jerusalem in 1099, they besieged it for five weeks and then stormed it. Sources on both sides describe a massacre of the city's inhabitants. Jerusalem's Jewish community, which had gathered in a synagogue, was burned alive.

Think about this: The Crusaders believed they were doing God's work. The communities they massacred also believed they were living according to God's will. What do we do with the fact that sincere religious belief has been used to justify both extraordinary compassion and extraordinary violence throughout history?`,
    },
  })

  // Mission 3 — Plant 7
  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-7' },
    update: {},
    create: {
      id: 'seed-plant-3-7',
      missionId: mission3.id,
      source: ContentSource.HARDCODED,
      createdBy: teacher.id,
      title: 'The Crusader Kingdom of Jerusalem: Structure and Lasting Legacy',
      openingMessage:
`Here's something that doesn't fit the simple narrative.

After the Crusaders conquered Jerusalem in 1099, they ruled it — and the surrounding territory — for nearly 200 years. A tiny European minority governing a region where they were surrounded by Muslim and Eastern Christian populations they had just fought. And during that time, they traded with them. Adopted their customs. Negotiated truces. Ate their food.

I want you to come out of this with one answer: does 200 years of complicated coexistence — even between people who were also in conflict — tell us something about what's possible? Or does it not count because the violence was real too?`,
      content:
`After the conquest of Jerusalem in 1099, the Crusaders established a series of states along the eastern Mediterranean coast. The largest was the Kingdom of Jerusalem, which lasted nearly 200 years — until the fall of Acre in 1291.

During that time, European Crusaders had to govern a territory where they were a small minority among a much larger Muslim and Eastern Christian population, while facing constant external military pressure. The result was more complicated than simple conquest.

Crusaders adopted local customs, dress, foods, and medical practices. They negotiated truces and trading agreements with Muslim rulers. Italian merchant cities (Venice, Genoa, Pisa) built trading networks connecting Europe to the Islamic world, carrying goods — and ideas — in both directions. Military orders emerged: the Knights Templar and Knights Hospitaller combined monastic religious vows with professional military training, becoming enormously powerful across Europe.

The lasting legacies of the Crusades were multiple and contradictory: deepened hostility between Christianity and Islam; intensified persecution of Jews in Europe; but also accelerated cultural exchange, revived long-distance trade, and the transmission of Islamic science and philosophy to Europe. The Crusades helped cause the Renaissance. They also helped cause centuries of mutual distrust.

Think about this: The Crusader Kingdom lasted nearly 200 years. During that time, people from radically different cultures had to find ways to live in proximity. What does that tell us about what's possible — even between groups in active conflict?`,
    },
  })

  console.log('Seed complete:', {
    teacher: teacher.id,
    journey: journey.id,
    missions: [mission1.id, mission2.id, mission3.id],
    totalPlants: 16,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
