import { describe, it, expect } from 'vitest';
import { decideParentEmail, MIN_REPORTABLE_MINUTES, type ScheduleFacts } from '@/lib/parent-email-schedule';

const TOPIC = { planetId: 'p1', title: 'Nothing is ever lost', questions: ['Where does burnt paper go?', 'b', 'c'] };
const IN_PROGRESS = { planetId: 'p2', title: 'Where does the light go?', questions: [] };

function facts(over: Partial<ScheduleFacts> = {}): ScheduleFacts {
  return {
    localDayOfWeek: 2,            // Tuesday
    minutesYesterday: 0,
    topicsFinishedYesterday: [],
    topicInProgress: null,
    activeAnyDayThisWeek: false,
    ...over,
  };
}

describe('a finished topic', () => {
  it('sends the topic and its first question', () => {
    const d = decideParentEmail(facts({ minutesYesterday: 20, topicsFinishedYesterday: [TOPIC] }));
    expect(d).toEqual({
      kind: 'topic', planetId: 'p1',
      title: 'Nothing is ever lost',
      question: 'Where does burnt paper go?',
    });
  });

  // The cap that matters: a child on a roll can finish three in one sitting.
  it('sends ONE email about the most recent topic, not one per topic', () => {
    const d = decideParentEmail(facts({
      minutesYesterday: 60,
      topicsFinishedYesterday: [TOPIC, { ...TOPIC, planetId: 'p9', title: 'Older' }],
    }));
    expect(d?.planetId).toBe('p1');
  });

  it('still sends when generation produced no questions', () => {
    const d = decideParentEmail(facts({
      minutesYesterday: 20,
      topicsFinishedYesterday: [{ ...TOPIC, questions: [] }],
    }));
    expect(d?.kind).toBe('topic');
    expect(d?.question).toBeNull();
  });
});

describe('active but nothing finished', () => {
  it('reports progress on the topic in progress', () => {
    const d = decideParentEmail(facts({ minutesYesterday: 15, topicInProgress: IN_PROGRESS }));
    expect(d?.kind).toBe('progress');
    expect(d?.title).toBe('Where does the light go?');
  });

  it('sends nothing for a visit too short to report', () => {
    expect(decideParentEmail(facts({
      minutesYesterday: MIN_REPORTABLE_MINUTES - 1,
      topicInProgress: IN_PROGRESS,
    }))).toBeNull();
  });

  it('sends nothing when active but nothing started or finished', () => {
    expect(decideParentEmail(facts({ minutesYesterday: 30 }))).toBeNull();
  });
});

describe('not active', () => {
  it('sends nothing on an ordinary weekday', () => {
    expect(decideParentEmail(facts({ localDayOfWeek: 3 }))).toBeNull();
  });

  it('nudges on Sunday when the whole week was empty', () => {
    const d = decideParentEmail(facts({ localDayOfWeek: 0, activeAnyDayThisWeek: false }));
    expect(d?.kind).toBe('nudge');
  });

  // The clause that keeps the nudge from becoming nagging: a child who showed
  // up even once already generated an email that week.
  it('does NOT nudge on Sunday when the child showed up at all', () => {
    expect(decideParentEmail(facts({ localDayOfWeek: 0, activeAnyDayThisWeek: true }))).toBeNull();
  });

  it('does not nudge mid-week even after a fully empty week', () => {
    expect(decideParentEmail(facts({ localDayOfWeek: 4, activeAnyDayThisWeek: false }))).toBeNull();
  });
});

describe('the founder\'s worked examples', () => {
  it('child visits Monday only → one email Tuesday, no Sunday nudge', () => {
    const tuesday = decideParentEmail(facts({
      localDayOfWeek: 2, minutesYesterday: 25, topicsFinishedYesterday: [TOPIC],
    }));
    expect(tuesday?.kind).toBe('topic');

    const sunday = decideParentEmail(facts({ localDayOfWeek: 0, activeAnyDayThisWeek: true }));
    expect(sunday).toBeNull();
  });

  it('child visits Monday and Tuesday → an email on each of Tuesday and Wednesday', () => {
    for (const day of [2, 3]) {
      const d = decideParentEmail(facts({
        localDayOfWeek: day, minutesYesterday: 25, topicsFinishedYesterday: [TOPIC],
      }));
      expect(d?.kind).toBe('topic');
    }
  });

  it('child never visits → exactly one nudge, on Sunday', () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map(day =>
      decideParentEmail(facts({ localDayOfWeek: day, activeAnyDayThisWeek: false })),
    );
    expect(week.filter(Boolean)).toHaveLength(1);
    expect(week[0]?.kind).toBe('nudge');
  });
});
