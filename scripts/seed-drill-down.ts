// src/astroli-web/scripts/seed-drill-down.ts
// Run with: npx tsx scripts/seed-drill-down.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// { level, completionType } — null level combined with 'standard' means "no summary yet".
const SAMPLE_PERFORMANCES: { level: number | null; completionType: 'standard' | 'grace' }[] = [
  { level: 1, completionType: 'standard' },
  { level: 5, completionType: 'standard' },
  { level: 3, completionType: 'grace' },
  { level: 4, completionType: 'standard' },
  { level: null, completionType: 'standard' }, // not started / in_progress
  { level: 2, completionType: 'standard' },
  { level: 3, completionType: 'standard' },
];

async function seedStudent(student: { id: string; full_name: string | null; first_name: string | null }) {
  const name = student.full_name ?? student.first_name ?? student.id;
  console.log(`\nSeeding: ${name} (${student.id})`);

  const enrollments = await prisma.student_journeys.findMany({
    where: { student_id: student.id },
    select: {
      class: {
        select: {
          journey: {
            select: {
              id: true,
              missions: {
                orderBy: { mission_order: 'asc' },
                select: {
                  id: true,
                  planets: {
                    select: { id: true, title: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const planets = enrollments.flatMap((e) =>
    e.class.journey.missions.flatMap((m) => m.planets),
  );

  if (planets.length === 0) {
    console.log('  (no planets — skipping)');
    return;
  }

  console.log(`  Found ${planets.length} planets.`);

  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    const sample = SAMPLE_PERFORMANCES[i % SAMPLE_PERFORMANCES.length];
    const isNotStarted = sample.level === null && i % 3 === 0;

    if (isNotStarted) {
      console.log(`  ✓ ${planet.title} → not_started`);
      continue;
    }

    const summary = await prisma.planetSummary.upsert({
      where: { studentId_planetId: { studentId: student.id, planetId: planet.id } },
      create: {
        studentId: student.id,
        planetId: planet.id,
        completionType: sample.completionType,
        highestPerkinsLevelDemonstrated: sample.level,
        completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        termDefinitions: [],
      },
      update: {
        completionType: sample.completionType,
        highestPerkinsLevelDemonstrated: sample.level,
        completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.planetSummaryGoal.deleteMany({ where: { summaryId: summary.id } });

    await prisma.planetSummaryGoal.create({
      data: {
        summaryId: summary.id,
        termName: `Core concept of ${planet.title}`,
        perkinsLevelDemonstrated: sample.level,
        insightText: `The student can explain what makes ${planet.title} significant.`,
        conversationEvidence: `I think it's significant because it changed the way people understood the world at the time. The main idea was that everything connected back to this central principle.`,
      },
    });

    if (i % 2 === 0) {
      await prisma.planetSummaryGoal.create({
        data: {
          summaryId: summary.id,
          termName: `Applying ${planet.title} today`,
          perkinsLevelDemonstrated: sample.level,
          insightText: `The student can apply what they learned about ${planet.title} to a modern context.`,
          conversationEvidence: `You could see this in how modern governments work. They still use similar structures to what was described, just updated for today's technology and scale.`,
        },
      });
    }

    console.log(`  ✓ ${planet.title} → completed (${sample.completionType}, level ${sample.level})`);
  }
}

async function main() {
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    select: { id: true, full_name: true, first_name: true },
  });

  if (students.length === 0) {
    console.error('No students found in the database.');
    process.exit(1);
  }

  console.log(`Found ${students.length} student(s). Seeding drill-down data...`);

  for (const student of students) {
    await seedStudent(student);
  }

  console.log('\nSeed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
