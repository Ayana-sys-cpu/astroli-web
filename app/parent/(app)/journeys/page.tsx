'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JourneyCard, { type JourneyCardData } from '@/components/teacher/journeys/JourneyCard';

interface CatalogJourney {
  id: string;
  title: string;
  description: string;
  missionCount: number;
}

export default function ParentJourneysPage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<JourneyCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogJourney[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const loadJourneys = useCallback(() => {
    setLoading(true);
    fetch('/api/parent/journeys')
      .then((r) => {
        if (r.status === 401 || r.status === 403) { router.replace('/'); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (d) setJourneys(d.journeys ?? []); })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { loadJourneys(); }, [loadJourneys]);

  function openCatalog() {
    setShowCatalog(true);
    setEnrollError(null);
    setCatalogLoading(true);
    fetch('/api/parent/journeys/catalog')
      .then((r) => r.json())
      .then((d) => setCatalog(d.journeys ?? []))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }

  async function enroll(journeyId: string) {
    setEnrolling(journeyId);
    setEnrollError(null);
    const res = await fetch('/api/parent/journeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeyId }),
    });
    if (res.ok) {
      setShowCatalog(false);
      loadJourneys();
    } else {
      const body = await res.json().catch(() => ({}));
      setEnrollError(body.error ?? 'Enrollment failed — please try again.');
    }
    setEnrolling(null);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid rgba(139,0,255,0.2)', borderTopColor: '#8B00FF',
          animation: 'spin 0.8s linear infinite', display: 'inline-block',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-space font-black" style={{ fontSize: 26, letterSpacing: '0.12em', color: '#1a1a2e' }}>
            JOURNEYS
          </h1>
          <p className="font-inter" style={{ fontSize: 11, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.04em', marginTop: 6 }}>
            Your child&apos;s learning journeys
          </p>
        </div>
        <button
          onClick={openCatalog}
          className="font-space font-bold"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            borderRadius: 999,
            fontSize: 11,
            letterSpacing: '0.12em',
            background: 'linear-gradient(120deg, #FF0080, #8B00FF)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 18px rgba(139,0,255,0.25)',
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: '1',
          }}>+</span>
          ADD JOURNEY
        </button>
      </div>

      {/* Journey cards */}
      {journeys.length === 0 ? (
        <div style={{
          maxWidth: 420, padding: '32px 28px',
          border: '1px dashed rgba(26,26,46,0.15)', borderRadius: 16,
          textAlign: 'center',
        }}>
          <p className="font-space" style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
            No journeys yet
          </p>
          <p className="font-inter" style={{ fontSize: 12, color: 'rgba(26,26,46,0.45)', marginBottom: 20 }}>
            Add a journey to start your child on a learning path.
          </p>
          <button
            onClick={openCatalog}
            style={{
              padding: '9px 20px', borderRadius: 999, border: 'none',
              background: 'linear-gradient(120deg, #FF0080, #8B00FF)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            BROWSE JOURNEYS
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {journeys.map((j) => <JourneyCard key={j.id} journey={j} href={null} />)}
        </div>
      )}

      {/* Catalog modal */}
      {showCatalog && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCatalog(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px 32px',
            width: '100%', maxWidth: 520, maxHeight: '80vh',
            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="font-space font-bold" style={{ fontSize: 16, letterSpacing: '0.1em', color: '#1a1a2e', margin: 0 }}>
                ADD A JOURNEY
              </h2>
              <button
                onClick={() => setShowCatalog(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'rgba(26,26,46,0.4)', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {enrollError && (
              <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 8 }}>
                {enrollError}
              </p>
            )}

            {catalogLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2px solid rgba(139,0,255,0.2)', borderTopColor: '#8B00FF',
                  animation: 'spin 0.8s linear infinite', display: 'inline-block',
                }} />
              </div>
            ) : catalog.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.45)', textAlign: 'center', padding: '24px 0' }}>
                No more journeys available — your child is already enrolled in everything!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {catalog.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: 12,
                      border: '1px solid rgba(26,26,46,0.1)',
                      background: 'rgba(248,248,252,0.8)',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <p className="font-space" style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: '0 0 3px' }}>
                        {j.title}
                      </p>
                      <p className="font-inter" style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', margin: 0 }}>
                        {j.missionCount} mission{j.missionCount !== 1 ? 's' : ''}
                        {j.description ? ` · ${j.description}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => enroll(j.id)}
                      disabled={enrolling === j.id}
                      style={{
                        padding: '8px 18px', borderRadius: 999,
                        border: 'none',
                        background: enrolling === j.id ? 'rgba(139,0,255,0.3)' : 'linear-gradient(120deg, #FF0080, #8B00FF)',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.08em', cursor: enrolling === j.id ? 'default' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {enrolling === j.id ? '…' : 'ADD'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
