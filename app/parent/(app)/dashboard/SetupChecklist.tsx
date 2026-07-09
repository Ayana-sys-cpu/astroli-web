'use client';

import { useRouter } from 'next/navigation';

export type SetupStep = 'no_child' | 'no_journey' | 'no_activity' | 'active';

const STEPS: { step: Exclude<SetupStep, 'active'>; label: string }[] = [
  { step: 'no_child', label: "Child's account" },
  { step: 'no_journey', label: 'Choose a journey' },
  { step: 'no_activity', label: 'Start first mission' },
];

const STEP_ORDER: Record<SetupStep, number> = { no_child: 0, no_journey: 1, no_activity: 2, active: 3 };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SetupChecklist({
  step,
  nextActionLabel,
  nextActionHref,
  childName,
}: {
  step: SetupStep;
  nextActionLabel: string | null;
  nextActionHref: string | null;
  childName: string | null;
}) {
  const router = useRouter();
  const currentOrder = STEP_ORDER[step];
  const displayName = childName ?? 'your child';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
        {STEPS.map(({ step: s, label }) => {
          const order = STEP_ORDER[s];
          const done = order < currentOrder;
          const isCurrent = s === step;
          return (
            <li key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                background: done ? '#8B00FF' : 'transparent',
                color: done ? '#fff' : isCurrent ? '#8B00FF' : 'rgba(26,26,46,0.3)',
                border: done ? 'none' : `1px solid ${isCurrent ? 'rgba(139,0,255,0.6)' : 'rgba(26,26,46,0.15)'}`,
              }}>
                {done ? '✓' : ''}
              </span>
              <span style={{
                color: done ? 'rgba(26,26,46,0.4)' : isCurrent ? '#1a1a2e' : 'rgba(26,26,46,0.3)',
                fontWeight: isCurrent ? 600 : 400,
                textDecoration: done ? 'line-through' : 'none',
              }}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      {step === 'no_activity' && (
        <p style={{ fontSize: 12, color: 'rgba(26,26,46,0.5)', margin: 0 }}>
          {capitalize(displayName)} hasn&apos;t started their first mission yet. Sit down together and help them pick
          one from the journey to get going.
        </p>
      )}

      {nextActionLabel && nextActionHref && (
        <button
          onClick={() => router.push(nextActionHref)}
          style={{
            fontSize: 13, color: '#8B00FF', background: 'none', border: 'none', cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 4, padding: 0, alignSelf: 'flex-start',
          }}
        >
          {nextActionLabel} →
        </button>
      )}
    </div>
  );
}
