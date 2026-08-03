'use client';
import { useState } from 'react';
import type { ParentTopic } from '@/app/api/parent/home/route';

// One card per finished topic — not per goal.
//
// A topic holds several goals; a question per goal would produce ~15 questions
// in a week. A parent has one dinner, not fifteen. The goal-by-goal depth still
// exists, one tap deeper.

const COPY = {
  en: {
    finished:   'Finished',
    inProgress: 'Working on now',
    askAtDinner:'Ask at dinner',
    showMore:   'Show me two more',
    showLess:   'Show fewer',
    justStarted:'Just started — nothing to talk about yet. Check back in a few days.',
  },
  he: {
    finished:   'הושלם',
    inProgress: 'עובד/ת על זה עכשיו',
    askAtDinner:'שאלי בארוחת ערב',
    showMore:   'עוד שתי שאלות',
    showLess:   'פחות',
    justStarted:'רק התחיל — עוד אין על מה לדבר. בדקי שוב בעוד כמה ימים.',
  },
} as const;

interface Props {
  topic: ParentTopic;
  language: 'en' | 'he';
}

export default function TopicCard({ topic, language }: Props) {
  const [expanded, setExpanded] = useState(false);
  const t = COPY[language];
  const rtl = language === 'he';
  const finished = topic.status === 'finished';

  // A topic whose generation failed shows its recap with no question block —
  // never a placeholder and never an error. It should read as intentional.
  const questions = topic.questions;
  const shown = expanded ? questions : questions.slice(0, 1);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        background: '#fff',
        border: '1px solid rgba(26,26,46,0.08)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 12,
        textAlign: rtl ? 'right' : 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap',
          background: finished ? 'rgba(29,158,117,0.1)' : 'rgba(139,0,255,0.08)',
          color:      finished ? '#0f6e56'              : '#8B00FF',
        }}>
          {finished ? t.finished : t.inProgress}
        </span>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{topic.title}</p>
      </div>

      {topic.recap ? (
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(26,26,46,0.6)', lineHeight: 1.6 }}>
          {topic.recap}
        </p>
      ) : !finished ? (
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(26,26,46,0.5)', lineHeight: 1.6 }}>
          {t.justStarted}
        </p>
      ) : null}

      {questions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(26,26,46,0.07)', paddingTop: 12 }}>
          <p style={{
            margin: '0 0 6px', fontSize: 11, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)',
          }}>
            {t.askAtDinner}
          </p>

          {shown.map((q, i) => (
            <p key={i} style={{ margin: '0 0 8px', fontSize: 15, color: '#1a1a2e', lineHeight: 1.55 }}>
              “{q}”
            </p>
          ))}

          {questions.length > 1 && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 13, color: '#8B00FF', textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {expanded ? t.showLess : t.showMore}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
