'use client';
import TopicCard from './TopicCard';
import type { ParentTopic } from '@/app/api/parent/home/route';

// The parent's landing view: what their child learned, and what to ask tonight.
// The teacher-style drill-down is still there, one tap behind the footer link —
// it is the depth that proves the product works, just not the front page.

export interface ParentHomeData {
  child: string | null;
  language: 'en' | 'he';
  stats: {
    topicsFinishedThisWeek: number;
    topicsFinishedTotal: number;
    conversations: number;
    minutes: number;
  } | null;
  topics: ParentTopic[];
}

const COPY = {
  en: {
    thisWeek:  'This week',
    headline:  (name: string) => `${name} explored something new`,
    quiet:     (name: string) => `${name} hasn't finished a topic yet`,
    quietBody: 'Their first one will show up here, with a question you can ask about it.',
    stats:     (t: number, c: number, m: number) =>
      `${t} ${t === 1 ? 'topic' : 'topics'} finished · ${c} conversations · about ${m} minutes of thinking`,
    seeAll:    (name: string) => `See everything ${name} has learned`,
  },
  he: {
    thisWeek:  'השבוע',
    headline:  (name: string) => `${name} גילה משהו חדש`,
    quiet:     (name: string) => `${name} עדיין לא סיים נושא`,
    quietBody: 'הנושא הראשון יופיע כאן, יחד עם שאלה שאפשר לשאול עליו.',
    stats:     (t: number, c: number, m: number) =>
      `${t} נושאים הושלמו · ${c} שיחות · כ-${m} דקות של חשיבה`,
    seeAll:    (name: string) => `לראות את כל מה ש${name} למד`,
  },
} as const;

interface Props {
  data: ParentHomeData;
  onSeeEverything: () => void;
}

export default function WarmSummary({ data, onSeeEverything }: Props) {
  const { language, topics, stats } = data;
  const t = COPY[language];
  const rtl = language === 'he';
  const name = (data.child ?? '').split(' ')[0] || (rtl ? 'הילד/ה' : 'your child');

  const hasFinished = topics.some(x => x.status === 'finished');

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        flex: 1, overflowY: 'auto', padding: '24px 20px 40px',
        textAlign: rtl ? 'right' : 'left',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(26,26,46,0.5)' }}>{t.thisWeek}</p>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600, color: '#1a1a2e' }}>
          {hasFinished ? t.headline(name) : t.quiet(name)}
        </h1>

        {hasFinished && stats ? (
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(26,26,46,0.55)', lineHeight: 1.6 }}>
            {t.stats(stats.topicsFinishedTotal, stats.conversations, stats.minutes)}
          </p>
        ) : (
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(26,26,46,0.55)', lineHeight: 1.6 }}>
            {t.quietBody}
          </p>
        )}

        {topics.map(topic => (
          <TopicCard key={topic.planetId} topic={topic} language={language} />
        ))}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={onSeeEverything}
            style={{
              background: 'transparent',
              border: '1px solid rgba(26,26,46,0.15)',
              borderRadius: 8, padding: '10px 18px',
              fontSize: 13, color: '#1a1a2e', cursor: 'pointer',
            }}
          >
            {t.seeAll(name)}
          </button>
        </div>
      </div>
    </div>
  );
}
