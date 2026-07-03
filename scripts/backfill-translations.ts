import { translateMission, translateTeachingGoals } from '../lib/translate-mission';
import { prisma } from '../lib/prisma';

async function main() {
  const missions = await prisma.mission.findMany({
    where: { language: 'he' },
    select: { id: true, question: true, translations: true },
  });

  console.log(`Found ${missions.length} Hebrew mission(s) to backfill`);

  for (const mission of missions) {
    const tx = mission.translations as Record<string, unknown>;
    if (!tx.he) {
      console.log(`  ⟳ ${mission.id} — translating mission + planets + teaching goals...`);
      await translateMission(mission.id);
      console.log(`  ✓ ${mission.id} — done`);
      continue;
    }

    // Mission/planets already translated, but teaching goals were historically
    // never covered by translateMission — backfill them separately.
    console.log(`  ✓ ${mission.id} — mission already translated, checking teaching goals...`);
    const planets = await prisma.planet.findMany({ where: { missionId: mission.id }, select: { id: true } });
    await translateTeachingGoals(planets.map(p => p.id));
    console.log(`  ✓ ${mission.id} — teaching goals backfilled`);
  }

  console.log('Backfill complete.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
