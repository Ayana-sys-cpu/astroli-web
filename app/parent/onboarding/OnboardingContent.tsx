'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConsentStep from './ConsentStep';
import WelcomeTour from './WelcomeTour';
import { CONSENT_ITEMS } from '@/lib/consent-constants';
import { toDisplayFirstName } from '@/lib/display-name';

type Journey = { id: string; title: string; description: string; missionCount: number };

const CARD: React.CSSProperties = {
  background: '#080808',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
  borderRadius: '16px',
  position: 'relative',
  overflow: 'hidden',
};

const GRADIENT_STRIPE = (
  <div
    style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
      background: 'linear-gradient(90deg, #FF0080, #8B00FF, #00F5D4)',
      opacity: 0.7, pointerEvents: 'none',
    }}
  />
);

type OnboardingStatus = 'checking' | 'already_done' | 'ready';

// Flow: [tour] → email (1 of 3) → consent (2 of 3, the consent click sends the
// invite) → journey (3 of 3, invite-sent banner + picker). The tour shows once,
// only to brand-new parents with nothing set up yet.
type Step = 'tour' | 'email' | 'consent' | 'journey';

const TOUR_SEEN_KEY = 'astroli_parent_tour_seen';

function tourSeen(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === '1'; } catch { return false; }
}
function markTourSeen(): void {
  try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* private mode — show again next time */ }
}

export default function ParentOnboardingContent() {
  const router      = useRouter();
  const params      = useSearchParams();

  // On mount we check real DB state so we never show the wrong step and
  // always provide an escape hatch if the parent already completed setup.
  const [status, setStatus] = useState<OnboardingStatus>('checking');
  const [step, setStep]     = useState<Step>('email');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Consent state
  const [reconsent, setReconsent]         = useState(false);
  // True when the parent already finished setup (existing-parent back-fill or a
  // policy version bump): after consenting they return to the dashboard rather
  // than re-running the invite/journey steps.
  const [setupComplete, setSetupComplete] = useState(false);

  // Child + invite state
  const [childEmail, setChildEmail]       = useState('');
  const [childName, setChildName]         = useState<string | null>(null);
  const [childAccepted, setChildAccepted] = useState(false);
  const [inviteSent, setInviteSent]       = useState(false);
  const [hadPendingInvite, setHadPendingInvite] = useState(false);
  const [emailError, setEmailError]       = useState<string | null>(null);

  // Resend state (separate from main loading so it doesn't affect the form)
  const [resending,     setResending]     = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Journey step state
  const [journeys,  setJourneys]  = useState<Journey[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [locked,    setLocked]    = useState(false);
  const [language,  setLanguage]  = useState<'en' | 'he'>('en');
  const [journeysLoading, setJourneysLoading] = useState(true);

  // Check real setup state on mount — determines which step to show and
  // whether to render the escape hatch instead of the form.
  useEffect(() => {
    const stepParam = params.get('step');
    fetch('/api/parent/dashboard')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) { setStatus('ready'); setStep('email'); return; }

        const accepted = !!data.child;
        setChildAccepted(accepted);
        setChildName(data.child?.name ?? null);
        setHadPendingInvite(!!data.pendingInvite);
        if (data.child?.email) setChildEmail(data.child.email);
        else if (data.pendingInvite?.childEmail) setChildEmail(data.pendingInvite.childEmail);

        // Consent gate first — a parent without current-version consent is always
        // routed to the consent flow, even if their setup is otherwise complete
        // (existing-parent back-fill / re-consent after a policy version bump).
        const cs = data.consentStatus;
        if (cs && !cs.hasCurrentConsent) {
          setReconsent(!!cs.needsReconsent);
          setSetupComplete(!!data.familyClass);
          if (accepted) setStep('consent');                       // email known and fixed
          else if (data.pendingInvite) setStep('email');          // re-confirm, may edit
          else setStep(tourSeen() ? 'email' : 'tour');            // brand-new parent
          setStatus('ready');
          return;
        }

        if (data.familyClass) {
          setStatus('already_done');
          return;
        }
        if (data.setupState?.step === 'no_journey' || stepParam === 'journey') {
          setStep('journey');
        } else if (data.pendingInvite) {
          // Invite already out, child hasn't accepted — Step 3 with the banner.
          setStep('journey');
        } else {
          setStep('email');
        }
        setStatus('ready');
      })
      .catch(() => { setStatus('ready'); setStep('email'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyed off `step`: the picker fetches as soon as it renders, however the
  // parent reached it (mount routing or advancing from the consent step).
  useEffect(() => {
    if (step === 'journey') fetchJourneys(language);
  }, [language, step]);

  async function fetchJourneys(lang: 'en' | 'he') {
    setJourneysLoading(true);
    try {
      const res  = await fetch(`/api/parent/journeys/catalog?language=${lang}`);
      const data = await res.json();
      setJourneys(data.journeys ?? []);
    } catch {
      // network error — leave list empty, user can retry
    } finally {
      setJourneysLoading(false);
    }
  }

  function handleLanguageChange(lang: 'en' | 'he') {
    if (lang === language) return;
    setLanguage(lang);
    setSelected(null);
  }

  function handleContinueToConsent(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setStep('consent');
  }

  // The consent click does both: records the consent, then dispatches the
  // invite. Nothing is ever sent to the child before the consent exists (the
  // API enforces the same order with a 428). Throws with a user-facing message
  // so ConsentStep can display it inline.
  async function handleConsentAndInvite() {
    const consentRes = await fetch('/api/parent/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ childEmail, items: CONSENT_ITEMS }),
    });
    const consentData = await consentRes.json();
    if (!consentRes.ok) throw new Error(consentData.error ?? 'Something went wrong.');

    if (setupComplete) {
      // Existing parent re-consented — nothing else to set up.
      router.replace('/parent/dashboard');
      return;
    }
    if (childAccepted) {
      // Child is already in — no invite to send, straight to the picker.
      setStep('journey');
      return;
    }

    const inviteRes  = await fetch('/api/parent/child-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ childEmail }),
    });
    const inviteData = await inviteRes.json();

    if (inviteRes.status === 409) {
      // Already has a linked child — invite is moot, move on.
      setStep('journey');
      return;
    }
    if (inviteRes.status === 422) {
      // School-linked email — back to Step 1 so the parent can change it.
      setEmailError(inviteData.error ?? 'This email cannot be invited — try another.');
      setStep('email');
      return;
    }
    if (!inviteRes.ok) throw new Error(inviteData.error ?? 'Something went wrong.');

    setInviteSent(true);
    setStep('journey');
  }

  async function handleResendInvite() {
    setResending(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/parent/child-invite/resend', { method: 'POST' });
      if (res.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 4000);
      }
    } catch {
      // network error — stay idle so user can retry
    } finally {
      setResending(false);
    }
  }

  async function handlePickJourney(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/parent/family-class', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ journeyId: selected, language }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.status === 409 && data.code === 'child_already_enrolled') {
      // Child already studies this journey in another class (e.g. at school) —
      // keep the picker open so the parent can choose a different journey.
      setError(data.error);
      return;
    }

    if (res.status === 409) {
      setLocked(true);
      setError('Journey is locked — contact support to change.');
      return;
    }

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    const journeyTitle = journeys.find(j => j.id === selected)?.title ?? '';
    const displayName  = toDisplayFirstName(childName ?? childEmail);
    router.push(
      `/parent/reveal?childName=${encodeURIComponent(displayName)}&journeyTitle=${encodeURIComponent(journeyTitle)}`
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === 'checking') {
    return (
      <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md" style={{ ...CARD, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {GRADIENT_STRIPE}
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid rgba(0,245,212,0.2)', borderTopColor: '#00F5D4',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // ── Already done ─────────────────────────────────────────────────────────────
  if (status === 'already_done') {
    return (
      <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md" style={CARD}>
          {GRADIENT_STRIPE}
          <div className="p-8 space-y-5">
            <div className="space-y-1">
              <h1 className="font-space text-2xl font-bold text-white">You&apos;re already set up</h1>
              <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your journey is selected and your child&apos;s invite is on its way.
                Head to your dashboard to see the status.
              </p>
            </div>
            <button
              onClick={() => router.replace('/parent/dashboard')}
              className="btn-teal"
            >
              Go to dashboard →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Intro: app preview tour (brand-new parents, once) ───────────────────────
  if (step === 'tour') {
    return (
      <WelcomeTour
        onDone={() => {
          markTourSeen();
          setStep('email');
        }}
      />
    );
  }

  // ── Step 1 of 3: child's email ──────────────────────────────────────────────
  if (step === 'email') {
    return (
      <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md" style={CARD}>
          {GRADIENT_STRIPE}
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <p className="font-space text-[9px] font-bold uppercase text-[#00F5D4]" style={{ letterSpacing: '0.22em' }}>
                Step 1 of 3
              </p>
              <h1 className="font-space text-2xl font-bold text-white">
                Set up your child&apos;s account
              </h1>
              <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Enter your child&apos;s Gmail address. You&apos;ll review your consent next —
                nothing is sent until you approve it.
              </p>
            </div>

            <form onSubmit={handleContinueToConsent} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  className="font-space text-[10px] font-bold uppercase"
                  style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em' }}
                  htmlFor="childEmail"
                >
                  Child&apos;s Gmail
                </label>
                <input
                  id="childEmail"
                  type="email"
                  required
                  value={childEmail}
                  onChange={e => setChildEmail(e.target.value)}
                  placeholder="child@gmail.com"
                  className="input-dark"
                />
              </div>

              {emailError && (
                <p className="font-inter text-sm" style={{ color: '#FF0080' }}>{emailError}</p>
              )}

              <button
                type="submit"
                disabled={!childEmail}
                className="btn-teal"
                style={{ marginTop: '8px', opacity: !childEmail ? 0.4 : 1 }}
              >
                Continue to consent →
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // ── Step 2 of 3: consent (the consent click sends the invite) ───────────────
  if (step === 'consent') {
    return (
      <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md" style={CARD}>
          {GRADIENT_STRIPE}
          <ConsentStep
            childEmail={childEmail}
            reconsent={reconsent}
            willSendInvite={!setupComplete && !childAccepted}
            onChangeEmail={!childAccepted ? () => { setEmailError(null); setStep('email'); } : undefined}
            onSubmit={handleConsentAndInvite}
          />
        </div>
      </main>
    );
  }

  // ── Step 3 of 3: journey picker (+ invite-sent banner) ──────────────────────
  const showInviteBanner = (inviteSent || hadPendingInvite) && !childAccepted;

  return (
    <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md" style={CARD}>
        {GRADIENT_STRIPE}
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <p className="font-space text-[9px] font-bold uppercase text-[#00F5D4]" style={{ letterSpacing: '0.22em' }}>
              Step 3 of 3
            </p>
            <h1 className="font-space text-2xl font-bold text-white">
              Choose a learning journey
            </h1>
            <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Pick the journey your child will explore. This cannot be changed later.
            </p>
          </div>

          {/* Invite-sent banner — child can accept in parallel while the parent
              picks the journey. Resend + change email both live here. */}
          {showInviteBanner && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.2)' }}
            >
              <div className="space-y-1">
                <p className="font-space text-sm font-bold text-white">
                  Invite sent to {childEmail}
                </p>
                <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Ask your child to check their email and click the invite link.
                  The link expires in 48 hours.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleResendInvite}
                  disabled={resending || resendSuccess}
                  className="font-inter text-sm underline underline-offset-4 disabled:opacity-50"
                  style={{ color: resendSuccess ? '#00F5D4' : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: resending || resendSuccess ? 'default' : 'pointer', padding: 0 }}
                >
                  {resending ? 'Sending…' : resendSuccess ? 'Invite sent' : 'Resend invite'}
                </button>
                <button
                  onClick={() => { setEmailError(null); setStep('email'); }}
                  className="font-inter text-sm underline underline-offset-4"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Change email
                </button>
              </div>
            </div>
          )}

          {/* Language toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.12)', width: 'fit-content' }}
            role="group"
            aria-label="Journey language"
          >
            {(['en', 'he'] as const).map((lang) => {
              const active = language === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className="font-space text-xs font-bold px-4 py-2 transition-colors"
                  style={{
                    background:  active ? '#00F5D4' : 'transparent',
                    color:       active ? '#000'    : 'rgba(255,255,255,0.45)',
                    border:      'none',
                    cursor:      'pointer',
                    letterSpacing: '0.08em',
                  }}
                >
                  {lang === 'en' ? 'English' : 'עברית'}
                </button>
              );
            })}
          </div>

          {journeysLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading journeys">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="rounded-xl p-4 animate-pulse"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ height: '13px', width: '55%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', marginBottom: '6px' }} />
                  <div style={{ height: '11px', width: '80%', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }} />
                </div>
              ))}
            </div>
          ) : journeys.length === 0 ? (
            <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No {language === 'he' ? 'Hebrew' : 'English'} journeys are available yet.
            </p>
          ) : (
            <form onSubmit={handlePickJourney} className="space-y-4">
              <div className="space-y-2">
                {journeys.map(j => {
                  const isSelected = selected === j.id;
                  return (
                    <label
                      key={j.id}
                      className="flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all"
                      style={{
                        background: isSelected ? 'rgba(0,245,212,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'rgba(0,245,212,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      {/* Custom radio */}
                      <div
                        className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full transition-all"
                        style={{
                          width: '16px', height: '16px',
                          border: `2px solid ${isSelected ? '#00F5D4' : 'rgba(255,255,255,0.2)'}`,
                          background: isSelected ? '#00F5D4' : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000' }} />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="journey"
                        value={j.id}
                        checked={isSelected}
                        onChange={() => setSelected(j.id)}
                        className="sr-only"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-space text-sm font-bold text-white">{j.title}</p>
                        {j.description && (
                          <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {j.description}
                          </p>
                        )}
                        <p className="font-inter text-xs mt-1" style={{ color: 'rgba(0,245,212,0.7)' }}>
                          {j.missionCount} missions
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {error && (
                <p className="font-inter text-sm" style={{ color: '#FF0080' }}>{error}</p>
              )}
              {locked && (
                <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Contact support if you need to change your journey.
                </p>
              )}

              <button
                type="submit"
                disabled={!selected || loading || locked}
                className="btn-teal"
                style={{ opacity: (!selected || loading || locked) ? 0.4 : 1 }}
              >
                {loading ? 'Confirming…' : 'Start this journey →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
