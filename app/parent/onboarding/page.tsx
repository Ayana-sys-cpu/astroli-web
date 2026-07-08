'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Journey = { id: string; title: string; description: string; missionCount: number };

export default function ParentOnboardingPage() {
  const router     = useRouter();
  const params     = useSearchParams();
  const initialStep = params.get('step') === 'journey' ? 'journey' : 'invite';

  const [step, setStep]       = useState<'invite' | 'journey'>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Invite step state
  const [childEmail, setChildEmail] = useState('');
  const [childName,  setChildName]  = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  // Journey step state
  const [journeys,  setJourneys]  = useState<Journey[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [locked,    setLocked]    = useState(false);

  useEffect(() => {
    if (step === 'journey') fetchJourneys();
  }, [step]);

  async function fetchJourneys() {
    const res  = await fetch('/api/parent/journeys');
    const data = await res.json();
    setJourneys(data.journeys ?? []);
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/parent/child-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ childEmail, childName }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    setInviteSent(true);
  }

  async function handleResendInvite() {
    setLoading(true);
    await fetch('/api/parent/child-invite/resend', { method: 'POST' });
    setLoading(false);
  }

  async function handlePickJourney(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/parent/family-class', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ journeyId: selected }),
    });
    const data = await res.json();
    setLoading(false);

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
    router.push(
      `/parent/reveal?childName=${encodeURIComponent(childName)}&journeyTitle=${encodeURIComponent(journeyTitle)}`
    );
  }

  // ── Step 1: Invite ──────────────────────────────────────────────────────────
  if (step === 'invite') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Set up your child&apos;s account</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter your child&apos;s Gmail address. They&apos;ll receive an invite to join your space.
            </p>
          </div>

          {!inviteSent ? (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="childName">Child&apos;s name</label>
                <input
                  id="childName"
                  type="text"
                  required
                  value={childName}
                  onChange={e => setChildName(e.target.value)}
                  placeholder="Alex"
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="childEmail">Child&apos;s Gmail</label>
                <input
                  id="childEmail"
                  type="email"
                  required
                  value={childEmail}
                  onChange={e => setChildEmail(e.target.value)}
                  placeholder="child@gmail.com"
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Invite'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border p-4 text-sm">
                <p className="font-medium">Invite sent to {childEmail}</p>
                <p className="text-muted-foreground mt-1">
                  Ask {childName} to check their email and click the invite link.
                  The link expires in 48 hours.
                </p>
              </div>

              <button
                onClick={handleResendInvite}
                disabled={loading}
                className="text-sm underline underline-offset-4 disabled:opacity-50"
              >
                {loading ? 'Resending…' : 'Resend invite'}
              </button>

              <button
                onClick={() => { setStep('journey'); fetchJourneys(); }}
                className="w-full rounded-md border px-4 py-2 text-sm font-medium"
              >
                Continue to choose a journey →
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Step 2: Journey picker ──────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Choose a learning journey</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick the journey your child will explore. This cannot be changed later.
          </p>
        </div>

        {journeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading journeys…</p>
        ) : (
          <form onSubmit={handlePickJourney} className="space-y-4">
            <div className="space-y-2">
              {journeys.map(j => (
                <label
                  key={j.id}
                  className={`flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-colors ${
                    selected === j.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="journey"
                    value={j.id}
                    checked={selected === j.id}
                    onChange={() => setSelected(j.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-sm">{j.title}</p>
                    {j.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{j.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{j.missionCount} missions</p>
                  </div>
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {locked && (
              <p className="text-sm text-muted-foreground">
                Contact support if you need to change your journey.
              </p>
            )}

            <button
              type="submit"
              disabled={!selected || loading || locked}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Confirming…' : 'Start this journey'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
