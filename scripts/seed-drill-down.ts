// src/astroli-web/scripts/seed-drill-down.ts
// Run with: npx tsx scripts/seed-drill-down.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_PERFORMANCES = [
  'explaining',
  'applying_concepts',
  'grace_completion',
  'generalizing',
  null, // not started / in_progress
  'mustering_evidence',
  'finding_examples',
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
    const perfType = SAMPLE_PERFORMANCES[i % SAMPLE_PERFORMANCES.length];
    const isNotStarted = perfType === null && i % 3 === 0;
    const status = isNotStarted ? 'not_started' : perfType === null ? 'in_progress' : 'completed';

    const summary = await prisma.planetSummary.upsert({
      where: { studentId_planetId: { studentId: student.id, planetId: planet.id } },
      create: {
        studentId: student.id,
        planetId: planet.id,
        status,
        performanceType: isNotStarted ? null : perfType,
        assessedAt: isNotStarted ? null : new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
      update: {
        status,
        performanceType: isNotStarted ? null : perfType,
        assessedAt: isNotStarted ? null : new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });

    if (!isNotStarted && perfType) {
      await prisma.planetSummaryGoal.deleteMany({ where: { summaryId: summary.id } });

      await prisma.planetSummaryGoal.create({
        data: {
          summaryId: summary.id,
          goalTitle: `Understanding the core concept of ${planet.title}`,
          performanceType: perfType,
          botQuestion: `Can you explain in your own words what makes ${planet.title} significant?`,
          studentAnswer: `I think it's significant because it changed the way people understood the world at the time. The main idea was that everything connected back to this central principle.`,
        },
      });

      if (i % 2 === 0) {
        await prisma.planetSummaryGoal.create({
          data: {
            summaryId: summary.id,
            goalTitle: `Applying lessons from ${planet.title} to modern contexts`,
            performanceType: 'applying_concepts',
            botQuestion: `How would you apply what you learned about ${planet.title} to a situation today?`,
            studentAnswer: `You could see this in how modern governments work. They still use similar structures to what was described, just updated for today's technology and scale.`,
          },
        });
      }
    }

    console.log(`  ✓ ${planet.title} → ${status}${perfType ? ` / ${perfType}` : ''}`);
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
