import { translateMission } from '../lib/translate-mission';
import { prisma } from '../lib/prisma';

async function main() {
  const missions = await prisma.mission.findMany({
    where: { language: 'he' },
    select: { id: true, question: true, translations: true },
  });

  console.log(`Found ${missions.length} Hebrew mission(s) to backfill`);

  for (const mission of missions) {
    const tx = mission.translations as Record<string, unknown>;
    if (tx.he) {
      console.log(`  ✓ ${mission.id} — already translated, skipping`);
      continue;
    }
    console.log(`  ⟳ ${mission.id} — translating...`);
    await translateMission(mission.id);
    console.log(`  ✓ ${mission.id} — done`);
  }

  console.log('Backfill complete.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
