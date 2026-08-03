/**
 * Dry run of the parent summary emails against production data.
 *
 * Sends nothing and logs nothing: it calls the cron handler with ?dry=1 and
 * prints who WOULD be emailed, in what language, about what.
 *
 * This is the gate before enabling sending. These emails quote a minor's own
 * words to an external service, and one sent to the wrong adult cannot be
 * recalled — so every recipient and body is read by a human first.
 *
 *   npx tsx scripts/dry-run-parent-emails.ts
 *   npx tsx scripts/dry-run-parent-emails.ts --html        (also dump one body)
 *   npx tsx scripts/dry-run-parent-emails.ts --at=<iso>    (simulate a moment)
 *
 * Without --at, running outside the morning window correctly decides to email
 * nobody — which is right, but useless for reviewing bodies.
 */

import { GET } from '../app/api/cron/parent-emails/route';

async function main() {
  const at = process.argv.find(a => a.startsWith('--at='))?.slice('--at='.length);
  const params = new URLSearchParams('dry=1');
  if (at) params.set('at', at);

  // The handler now fails closed, so the local run has to present the secret.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not set locally — pull it with `vercel env pull` first.');
    process.exit(1);
  }

  const req: any = {
    headers: { get: (h: string) => (h.toLowerCase() === 'authorization' ? `Bearer ${secret}` : null) },
    nextUrl: { searchParams: params },
  };

  const body = await (await GET(req)).json();

  console.log(`considered ${body.considered} parent(s)`);
  console.log('skipped:', body.skipped);
  console.log(`would send: ${body.decisions.length}`);

  for (const d of body.decisions) {
    console.log(`\n  to:       ${d.to}  [${d.language}]  kind=${d.kind}  about=${d.forDate}`);
    console.log(`  subject:  ${d.subject}`);
    console.log(`  topic:    ${d.topic ?? '—'}`);
    console.log(`  question: ${d.question ?? '—'}`);
  }

  if (process.argv.includes('--html') && body.decisions[0]) {
    console.log('\n--- first rendered body ---\n');
    console.log(body.decisions[0].html);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
