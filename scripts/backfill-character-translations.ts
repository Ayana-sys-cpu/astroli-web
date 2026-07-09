// One-time backfill: translate planet characters for missions already set to
// Hebrew (the pipeline only runs when a mission is newly flipped to 'he').
// Run: npx tsx --env-file=.env.local scripts/backfill-character-translations.ts
import { supabaseAdmin } from '../lib/supabase-server';
import { translatePlanetCharacters } from '../lib/translate-mission';

async function main() {
  const { data: missions, error: mErr } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('language', 'he');
  if (mErr) throw mErr;

  const { data: planets, error: pErr } = await supabaseAdmin
    .from('planets')
    .select('id')
    .in('mission_id', (missions ?? []).map(m => m.id));
  if (pErr) throw pErr;

  const planetIds = (planets ?? []).map(p => p.id);
  console.log(`Translating characters for ${planetIds.length} planets across ${missions?.length} Hebrew missions…`);
  await translatePlanetCharacters(planetIds);

  const { data: check } = await supabaseAdmin
    .from('planet_characters')
    .select('name, translations')
    .in('planet_id', planetIds);
  const done = (check ?? []).filter(c => (c.translations as any)?.he?.name);
  console.log(`Done: ${done.length}/${check?.length} characters now have Hebrew translations.`);
  for (const c of done) console.log(`  ${c.name} → ${(c.translations as any).he.name}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
