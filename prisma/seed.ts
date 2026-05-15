import { PrismaClient, MissionStatus } from '@prisma/client'

// TODO: Replace Mission questions and Plant content below with founder-approved content
// before running against production. Current content is placeholder — see docs/architecture/DB_ARCHITECTURE.md section 7.
// Also replace: PLACEHOLDER_TEACHER_GOOGLE_ID and PLACEHOLDER_REPLACE_WITH_REAL_GC_COURSE_ID

const prisma = new PrismaClient()

async function main() {
  // TODO: Replace PLACEHOLDER_TEACHER_GOOGLE_ID with the real teacher's Google ID before go-live
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

  // TODO: Replace PLACEHOLDER_REPLACE_WITH_REAL_GC_COURSE_ID with the real Google Classroom course ID
  const journey = await prisma.journey.upsert({
    where: { googleCourseId: 'PLACEHOLDER_REPLACE_WITH_REAL_GC_COURSE_ID' },
    update: {},
    create: {
      googleCourseId: 'PLACEHOLDER_REPLACE_WITH_REAL_GC_COURSE_ID',
      title: 'History',
      teacherId: teacher.id,
    },
  })

  const seedDate = new Date()
  const endDate = new Date(seedDate)
  endDate.setDate(endDate.getDate() + 90)

  // ── Mission 1: Who owns the truth? ───────────────────────────────────────
  const mission1 = await prisma.mission.upsert({
    where: { id: 'seed-mission-1' },
    update: {},
    create: {
      id: 'seed-mission-1',
      journeyId: journey.id,
      question: 'Who owns the truth?',
      status: MissionStatus.INACTIVE,
      startDate: seedDate,
      endDate: endDate,
      order: 1,
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-1' },
    update: {},
    create: {
      id: 'seed-plant-1-1',
      missionId: mission1.id,
      title: 'The invention of the printing press',
      content:
        "In the mid-1400s, Johannes Gutenberg's printing press shattered the Church's monopoly on written knowledge. For the first time, books could be mass-produced. Within decades, ideas — religious, scientific, political — spread faster than any authority could contain them. Consider: before the printing press, who decided what was true? Who controlled which books existed? And who lost power when that control disappeared?",
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-2' },
    update: {},
    create: {
      id: 'seed-plant-1-2',
      missionId: mission1.id,
      title: 'The rise of social media algorithms',
      content:
        "Today, what you see in your news feed is chosen by an algorithm — a set of rules built by a private company, optimised to keep you scrolling. No editor, no journalist, no government official decides what you read. A machine does. Consider: is this more or less democratic than the printing press era? Who benefits when the algorithm decides what is 'true enough' to show you?",
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-1-3' },
    update: {},
    create: {
      id: 'seed-plant-1-3',
      missionId: mission1.id,
      title: 'State-controlled media in the 20th century',
      content:
        "In the Soviet Union, Nazi Germany, and Maoist China, governments controlled all newspapers, radio, and film. They didn't just censor the truth — they manufactured an alternative one. Citizens often knew something was wrong but had no access to outside information. Consider: what happens to a society when there is no independent check on what the government calls 'the truth'?",
      createdBy: teacher.id,
    },
  })

  // ── Mission 2: What makes a civilization rise or fall? ───────────────────
  const mission2 = await prisma.mission.upsert({
    where: { id: 'seed-mission-2' },
    update: {},
    create: {
      id: 'seed-mission-2',
      journeyId: journey.id,
      question: 'What makes a civilization rise or fall?',
      status: MissionStatus.INACTIVE,
      startDate: seedDate,
      endDate: endDate,
      order: 2,
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-1' },
    update: {},
    create: {
      id: 'seed-plant-2-1',
      missionId: mission2.id,
      title: 'The fall of the Roman Empire',
      content:
        "Rome didn't fall in a day. Over centuries, a combination of military overstretch, economic strain, political instability, and external pressure from migrating peoples eroded the most powerful empire the ancient world had known. Historians still debate which factor mattered most. Consider: if you had been a Roman senator in 400 AD, what warning signs would you have seen? What could have been done differently?",
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-2' },
    update: {},
    create: {
      id: 'seed-plant-2-2',
      missionId: mission2.id,
      title: "The Mongol Empire's rapid expansion",
      content:
        "In less than 80 years, the Mongols built the largest contiguous land empire in history — stretching from China to Eastern Europe. Their secret was not just military force but adaptability: they adopted the skills of conquered peoples, created trade routes, and offered religious tolerance. Consider: what does the Mongol rise tell us about what makes a civilisation powerful? Is size always strength?",
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-2-3' },
    update: {},
    create: {
      id: 'seed-plant-2-3',
      missionId: mission2.id,
      title: 'The Black Death and European transformation',
      content:
        "When the plague killed one third of Europe's population between 1347 and 1351, it didn't just cause death — it caused social revolution. Surviving workers could demand higher wages. The Church, unable to explain or stop the plague, lost moral authority. Art turned darker and more humanist. Consider: can catastrophe accelerate progress? What did Europe gain from the Black Death, even as it lost so much?",
      createdBy: teacher.id,
    },
  })

  // ── Mission 3: How does power change hands? ───────────────────────────────
  const mission3 = await prisma.mission.upsert({
    where: { id: 'seed-mission-3' },
    update: {},
    create: {
      id: 'seed-mission-3',
      journeyId: journey.id,
      question: 'How does power change hands?',
      status: MissionStatus.INACTIVE,
      startDate: seedDate,
      endDate: endDate,
      order: 3,
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-1' },
    update: {},
    create: {
      id: 'seed-plant-3-1',
      missionId: mission3.id,
      title: 'The French Revolution',
      content:
        "In 1789, the people of France overthrew a monarchy that had ruled for centuries — not through a gradual reform but through violence, chaos, and eventually terror. What started as a demand for bread and rights ended with a king's execution and a decade of instability before Napoleon took control. Consider: is revolution an effective way to transfer power? What does the French Revolution tell us about what happens in the vacuum after power collapses?",
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-2' },
    update: {},
    create: {
      id: 'seed-plant-3-2',
      missionId: mission3.id,
      title: 'Mahatma Gandhi and non-violent resistance',
      content:
        "Gandhi led India's independence movement using a strategy that shocked the British Empire: non-cooperation, civil disobedience, and moral pressure rather than armed uprising. He understood that the coloniser's power depended partly on the colonised accepting it. Consider: what conditions are needed for non-violent resistance to work? Is it always possible, or only in certain political contexts?",
      createdBy: teacher.id,
    },
  })

  await prisma.plant.upsert({
    where: { id: 'seed-plant-3-3' },
    update: {},
    create: {
      id: 'seed-plant-3-3',
      missionId: mission3.id,
      title: 'The invention of elections',
      content:
        "The idea that power should transfer peacefully, on a fixed schedule, through a vote — is historically radical. For most of human history, power changed hands through death, conquest, or inheritance. Modern democracy invents a mechanism for regular, legitimate, non-violent power transfer. Consider: what makes people accept the result of an election they lost? What happens when they don't?",
      createdBy: teacher.id,
    },
  })

  console.log('Seed complete:', {
    teacher: teacher.id,
    journey: journey.id,
    missions: [mission1.id, mission2.id, mission3.id],
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
