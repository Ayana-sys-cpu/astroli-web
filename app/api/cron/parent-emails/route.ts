// GET /api/cron/parent-emails
//
// Runs ONCE DAILY at 04:00 UTC. The design wanted hourly, so that every parent
// is reached at 07:00 in their own local time — the pilot spans Israel and the
// US, and a single UTC hour is breakfast for one cohort and the middle of the
// night for the other. Vercel's Hobby plan permits only one cron run per day,
// so this compromises: 04:00 UTC is 07:00 in Israel (IDT, UTC+3), where the
// entire current cohort lives.
//
// Rather than pin the exact hour — which would silently send to nobody in
// winter, when Israel shifts to UTC+2 — a parent is emailed if their local time
// falls anywhere in the MORNING_WINDOW. That degrades honestly: a US parent
// added tomorrow simply receives nothing until the schedule can run hourly.
//
// To restore per-timezone 07:00 delivery: upgrade Vercel to Pro and change the
// cron in vercel.json back to "0 * * * *". Nothing else here needs to change.
//
// ?dry=1 resolves every recipient and renders every body WITHOUT sending or
// logging. These emails quote a minor's own words, and one sent to the wrong
// adult cannot be recalled, so the dry run is how a change gets verified.
//
// Response: 200 { ran, considered, decisions[], sent, skipped }
//           401 — bad or missing cron secret

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { decideParentEmail, MIN_REPORTABLE_MINUTES, type ScheduleFacts } from '@/lib/parent-email-schedule';
import { renderSummaryEmail } from '@/lib/parent-summary-email';
import { createUnsubscribeToken } from '@/lib/parent-unsubscribe-token';
import { sendSummaryEmail } from '@/lib/email';
import { hasCurrentConsent } from '@/lib/consent';

// The window a parent's local time must fall in. Wider than the 07:00 the
// design wanted, because the cron runs daily rather than hourly — but narrow
// enough that nobody is ever emailed at night.
const MORNING_WINDOW: readonly number[] = [5, 6, 7, 8, 9];
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  // Vercel cron sends this header; a manual call must supply the secret.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Outbound email to real parents is off until explicitly switched on. The
  // route, the schedule, and the rendering all run and report — they simply
  // don't dispatch. Set PARENT_EMAILS_ENABLED=true in the Vercel project to go
  // live; there is no code change involved.
  const sendingEnabled = process.env.PARENT_EMAILS_ENABLED === 'true';
  const dryRun = req.nextUrl.searchParams.get('dry') === '1' || !sendingEnabled;

  // A dry run may simulate a moment, so the bodies can be reviewed at any hour
  // rather than only during the morning window. Ignored unless dry=1 — a real
  // send always uses the true clock.
  const atParam = dryRun ? req.nextUrl.searchParams.get('at') : null;
  const now = atParam ? new Date(atParam) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: 'Invalid ?at' }, { status: 400 });
  }

  // Only parents who can actually receive one. Unsubscribed parents are excluded
  // in the query rather than filtered later — an opt-out that depends on a later
  // branch is one refactor away from being ignored.
  const { data: parents } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, first_name, language, timezone, summary_emails_enabled')
    .eq('role', 'parent')
    .eq('summary_emails_enabled', true);

  const decisions: any[] = [];
  let sent = 0;
  const skipped: Record<string, number> = {};
  const skip = (reason: string) => { skipped[reason] = (skipped[reason] ?? 0) + 1; };

  for (const parent of parents ?? []) {
    const tz = (parent as any).timezone || 'Asia/Jerusalem';

    if (!MORNING_WINDOW.includes(localHour(now, tz))) { skip('not_their_morning'); continue; }

    // FR: a parent without current-version consent receives nothing.
    if (!(await hasCurrentConsent(parent.id))) { skip('no_consent'); continue; }

    const { data: link } = await supabaseAdmin
      .from('parent_child_link')
      .select('child_id')
      .eq('parent_id', parent.id)
      .maybeSingle();

    if (!link?.child_id) { skip('no_child'); continue; }

    const childId = link.child_id;
    // The email is ABOUT yesterday, and the log is keyed on that local date so a
    // parent near midnight can't be sent twice.
    const localYesterday = localDate(new Date(now.getTime() - DAY_MS), tz);

    const facts = await gatherFacts(childId, tz, now);
    const decision = decideParentEmail(facts);

    if (!decision) { skip('nothing_to_say'); continue; }

    const { data: child } = await supabaseAdmin
      .from('users')
      .select('full_name, first_name, email')
      .eq('id', childId)
      .maybeSingle();

    const childName = firstNameOf(child) ?? 'your child';
    const language: 'en' | 'he' = (parent as any).language === 'he' ? 'he' : 'en';

    const rendered = renderSummaryEmail({
      parentName: firstNameOf(parent),
      childName,
      kind: decision.kind,
      topicTitle: decision.title,
      question: decision.question,
      language,
      unsubscribeToken: createUnsubscribeToken(parent.id),
    });

    decisions.push({
      parentId: parent.id,
      to: parent.email,
      language,
      kind: decision.kind,
      topic: decision.title,
      question: decision.question,
      subject: rendered.subject,
      forDate: localYesterday,
      ...(dryRun ? { html: rendered.html } : {}),
    });

    if (dryRun) continue;

    // Claim the slot BEFORE sending. The unique index is the one-per-day
    // guarantee; a duplicate here means another run already has it, and the
    // right move is to send nothing rather than a second email.
    const { error: logError } = await supabaseAdmin
      .from('parent_email_log')
      .insert({
        parent_id: parent.id,
        sent_for_date: localYesterday,
        kind: decision.kind,
        topic_title: decision.title,
      });

    if (logError) { skip('already_sent_today'); continue; }

    try {
      await sendSummaryEmail(parent.email, rendered.subject, rendered.html);
      sent++;
    } catch (err) {
      console.error('[cron/parent-emails] send failed:', err);
      // Release the slot so the next hourly run can retry — a claimed-but-unsent
      // slot would silently swallow that parent's email for the whole day.
      await supabaseAdmin
        .from('parent_email_log')
        .delete()
        .eq('parent_id', parent.id)
        .eq('sent_for_date', localYesterday);
      skip('send_failed');
    }
  }

  return NextResponse.json({
    ran: now.toISOString(),
    dryRun,
    sendingEnabled,
    considered: (parents ?? []).length,
    decisions,
    sent,
    skipped,
  });
}

// ── Facts ───────────────────────────────────────────────────────────────────

async function gatherFacts(childId: string, tz: string, now: Date): Promise<ScheduleFacts> {
  const yesterdayStart = startOfLocalDay(new Date(now.getTime() - DAY_MS), tz);
  const yesterdayEnd = new Date(yesterdayStart.getTime() + DAY_MS);
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);

  const [{ data: sessions }, { data: summaries }, { data: inProgress }] = await Promise.all([
    supabaseAdmin
      .from('student_activity_sessions')
      .select('started_at, last_ping_at')
      .eq('student_id', childId)
      .gte('started_at', weekStart.toISOString()),
    supabaseAdmin
      .from('planet_summaries')
      .select('planet_id, completed_at, parent_questions')
      .eq('student_id', childId)
      .gte('completed_at', yesterdayStart.toISOString())
      .lt('completed_at', yesterdayEnd.toISOString())
      .order('completed_at', { ascending: false }),
    supabaseAdmin
      .from('planet_session_state')
      .select('planet_id')
      .eq('student_id', childId)
      .eq('completed', false)
      .limit(1),
  ]);

  const minutesYesterday = (sessions ?? [])
    .filter(s => {
      const t = new Date(s.started_at).getTime();
      return t >= yesterdayStart.getTime() && t < yesterdayEnd.getTime();
    })
    .reduce((sum, s) => sum + minutesOf(s), 0);

  const planetIds = [
    ...(summaries ?? []).map((s: any) => s.planet_id),
    ...(inProgress ?? []).map((s: any) => s.planet_id),
  ];
  const titleById = await planetTitles(planetIds);

  return {
    localDayOfWeek: localDayOfWeek(now, tz),
    minutesYesterday,
    topicsFinishedYesterday: (summaries ?? []).map((s: any) => ({
      planetId: s.planet_id,
      title: titleById.get(s.planet_id) ?? '',
      questions: toQuestions(s.parent_questions),
    })),
    topicInProgress: (inProgress ?? []).length
      ? {
          planetId: (inProgress as any)[0].planet_id,
          title: titleById.get((inProgress as any)[0].planet_id) ?? '',
          questions: [],
        }
      : null,
    activeAnyDayThisWeek: (sessions ?? []).some(s => minutesOf(s) >= MIN_REPORTABLE_MINUTES),
  };
}

async function planetTitles(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabaseAdmin
    .from('planets')
    .select('id, label, short_title')
    .in('id', ids);
  // `label` before `short_title`: the parent has none of the child's context.
  // "Matter & Atoms" tells them what the topic was; "The Recipe" — the name
  // their child sees inside the journey — tells them nothing on its own.
  return new Map((data ?? []).map((p: any) => [p.id, p.label ?? p.short_title ?? '']));
}

function minutesOf(s: { started_at: string; last_ping_at: string }): number {
  return Math.max(1, Math.round(
    (new Date(s.last_ping_at).getTime() - new Date(s.started_at).getTime()) / 60_000,
  ));
}

function toQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(q => (typeof q === 'string' ? q : (q as any)?.question))
    .filter((q): q is string => typeof q === 'string' && q.trim().length > 0);
}

function firstNameOf(row: any): string | null {
  const full = row?.full_name ?? row?.first_name ?? null;
  if (full) return String(full).split(' ')[0];
  return row?.email ? String(row.email).split('@')[0] : null;
}

// ── Timezone helpers ────────────────────────────────────────────────────────
// Intl rather than a date library: no dependency, and it already knows DST.

function localHour(at: Date, tz: string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(at),
  );
}

function localDate(at: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at);
}

function localDayOfWeek(at: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(at);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

function startOfLocalDay(at: Date, tz: string): Date {
  // The local calendar date, reinterpreted as an instant by finding the offset
  // that timezone had at `at`.
  const dateStr = localDate(at, tz);
  const guess = new Date(`${dateStr}T00:00:00Z`);
  const offsetMs = guess.getTime() - new Date(
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(guess).replace(' ', 'T') + 'Z',
  ).getTime();
  return new Date(guess.getTime() + offsetMs);
}
