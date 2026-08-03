'use client';

import { useState } from 'react';
import { t, type Lang } from '@/lib/i18n';

// The first screen of parent onboarding.
//
// It comes before everything else so the rest of the flow — email, consent,
// journey picker — renders in the parent's own language. Previously the choice
// lived on the LAST step (the journey picker), which meant an Israeli parent
// read the entire signup in English before they could pick Hebrew.
//
// The chosen value is written to the parent immediately rather than held until
// the end: onboarding is already an authenticated surface, so there is an
// account to write to, and persisting straight away means a refresh mid-flow
// doesn't lose the choice.

interface Props {
  initial: Lang;
  onDone: (lang: Lang) => void;
}

const OPTIONS: Array<{ value: Lang; label: string; sub: string }> = [
  { value: 'he', label: 'עברית',   sub: 'Hebrew'  },
  { value: 'en', label: 'English', sub: 'אנגלית' },
];

export default function LanguageStep({ initial, onDone }: Props) {
  const [lang, setLang] = useState<Lang>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rtl = lang === 'he';

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/parent/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Timezone rides along with the language: both are "who is this
        // person", both are known here, and the summary emails need it to know
        // when 07:00 falls for them.
        body: JSON.stringify({
          language: lang,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      onDone(lang);
    } catch {
      setError(rtl ? 'לא הצלחנו לשמור — נסי שוב.' : "Couldn't save — try again.");
      setSaving(false);
    }
  }

  return (
    <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div
        className="w-full max-w-md"
        dir={rtl ? 'rtl' : 'ltr'}
        style={{
          background: '#080808',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: rtl ? 'right' : 'left',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, #FF0080, #8B00FF, #00F5D4)',
            opacity: 0.7, pointerEvents: 'none',
          }}
        />

        <div className="p-8 space-y-6">
          <div className="space-y-1">
            {/* A Latin brand name inside an RTL container renders reversed
                without an explicit direction. */}
            <p
              dir="ltr"
              className="font-space text-[9px] font-bold uppercase text-[#00F5D4]"
              style={{ letterSpacing: '0.22em', textAlign: rtl ? 'right' : 'left' }}
            >
              ASTROLI
            </p>
            <h1 className="font-space text-2xl font-bold text-white">
              {t('onbLanguageTitle', lang)}
            </h1>
            <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('onbLanguageSubtitle', lang)}
            </p>
          </div>

          <div role="radiogroup" aria-label={t('onbLanguageTitle', lang)} className="space-y-2">
            {OPTIONS.map(opt => {
              const active = lang === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLang(opt.value)}
                  className="w-full"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: active
                      ? '1px solid rgba(0,245,212,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: active ? 'rgba(0,245,212,0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'inherit',
                  }}
                >
                  <span
                    dir={opt.value === 'he' ? 'rtl' : 'ltr'}
                    className="font-space text-base font-bold"
                    style={{ color: active ? '#00F5D4' : 'rgba(255,255,255,0.85)' }}
                  >
                    {opt.label}
                  </span>
                  <span
                    className="font-inter text-xs"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="font-inter text-sm" style={{ color: '#FF0080' }}>{error}</p>
          )}

          <button onClick={handleContinue} disabled={saving} className="btn-teal w-full">
            {t('onbLanguageContinue', lang)}
          </button>
        </div>
      </div>
    </main>
  );
}
