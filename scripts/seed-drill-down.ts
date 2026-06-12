// src/astroli-web/scripts/seed-drill-down.ts
// Run with: npx tsx scripts/seed-drill-down.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Find a student by approximate name (edit to match your dev data) ──────
  const TARGET_STUDENT_NAME = 'Alex'; // Change to any student in your dev DB

  const student = await prisma.user.findFirst({
    where: {
      OR: [
        { full_name: { contains: TARGET_STUDENT_NAME, mode: 'insensitive' } },
        { first_name: { contains: TARGET_STUDENT_NAME, mode: 'insensitive' } },
      ],
      role: 'student',
    },
  });

  if (!student) {
    console.error(`No student found matching "${TARGET_STUDENT_NAME}". Edit TARGET_STUDENT_NAME.`);
    process.exit(1);
  }

  console.log(`Seeding drill-down data for: ${student.full_name ?? student.first_name} (${student.id})`);

  // ── Find this student's planets via journey enrollments ───────────────────
  const enrollments = await prisma.student_journeys.findMany({
    where: { student_id: student.id },
    include: {
      journeys: {
        include: {
          missions: {
            include: { planets: true },
            orderBy: { mission_order: 'asc' },
          },
        },
      },
    },
  });

  const planets = enrollments.flatMap((e) =>
    e.journeys.missions.flatMap((m) => m.planets),
  );

  if (planets.length === 0) {
    console.error('No planets found for this student. Check their journey enrollments.');
    process.exit(1);
  }

  console.log(`Found ${planets.length} planets. Seeding summaries...`);

  const SAMPLE_PERFORMANCES = [
    'explaining',
    'applying_concepts',
    'grace_completion',
    'generalizing',
    null, // not started
    'mustering_evidence',
    'finding_examples',
  ];

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
      // Seed 1-2 learning goals per completed planet
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

  console.log('\nSeed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
