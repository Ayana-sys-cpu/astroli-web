// When does a parent get an email, and what is it about?
//
// Pure decision logic, no I/O, so every rule below is testable without a
// database or a clock. The cron route supplies the facts; this decides.
//
// Rules (spec: specs/parent/web-app/parent-home-summary/spec.md):
//   finished a topic yesterday        → the topic + its dinner question
//   active, progressed, finished none → progress on the topic in progress
//   active under ~3 minutes           → nothing (nothing honest to report)
//   not active                        → nothing
//   ZERO active days all week         → one Sunday nudge
//
// The Sunday nudge fires only on a completely inactive week. A parent whose
// child showed up even once already got an email that week; nudging them on top
// of it reads as nagging.

export type ParentEmailKind = 'topic' | 'progress' | 'nudge';

export interface ScheduleFacts {
  /** The parent's local day-of-week for the run: 0 = Sunday. */
  localDayOfWeek: number;
  /** Minutes the child was active on the parent's previous local day. */
  minutesYesterday: number;
  /** Topics the child finished on the parent's previous local day, newest first. */
  topicsFinishedYesterday: Array<{ planetId: string; title: string; questions: string[] }>;
  /** The topic they are mid-way through, if any. */
  topicInProgress: { planetId: string; title: string; questions: string[] } | null;
  /** Whether the child was active on ANY day of the parent's local week. */
  activeAnyDayThisWeek: boolean;
}

export interface ScheduleDecision {
  kind: ParentEmailKind;
  planetId: string | null;
  title: string | null;
  question: string | null;
}

/** Below this, a visit has nothing worth writing home about. */
export const MIN_REPORTABLE_MINUTES = 3;

const SUNDAY = 0;

export function decideParentEmail(facts: ScheduleFacts): ScheduleDecision | null {
  const {
    localDayOfWeek, minutesYesterday, topicsFinishedYesterday,
    topicInProgress, activeAnyDayThisWeek,
  } = facts;

  // A finished topic is the best thing we can send, whatever else happened.
  // Only the most recent one — a child who finished three in a sitting still
  // gets their parent exactly one email.
  const finished = topicsFinishedYesterday[0];
  if (finished) {
    return {
      kind: 'topic',
      planetId: finished.planetId,
      title: finished.title,
      question: finished.questions[0] ?? null,
    };
  }

  const wasActive = minutesYesterday >= MIN_REPORTABLE_MINUTES;

  if (wasActive && topicInProgress) {
    return {
      kind: 'progress',
      planetId: topicInProgress.planetId,
      title: topicInProgress.title,
      question: topicInProgress.questions[0] ?? null,
    };
  }

  // Active but with nothing to report — a two-minute visit that finished
  // nothing and started nothing. Silence beats a hollow email.
  if (wasActive) return null;

  // Not active yesterday. The only remaining reason to write is a week in which
  // they were never active at all.
  if (localDayOfWeek === SUNDAY && !activeAnyDayThisWeek) {
    return { kind: 'nudge', planetId: null, title: null, question: null };
  }

  return null;
}
