'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JourneyCard, { type JourneyCardData } from '@/components/teacher/journeys/JourneyCard';
import NewJourneyCard from '@/components/teacher/journeys/NewJourneyCard';

export default function JourneysPage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<JourneyCardData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    fetch('/api/teacher/journeys-overview')
      .then(r => r.json())
      .then(data => { setJourneys(data.journeys ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? journeys.filter(j => j.title.toLowerCase().includes(search.toLowerCase()))
    : journeys;

  return (
    <div style={{ padding: '40px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-space font-black" style={{ fontSize: 26, letterSpacing: '0.12em', color: '#1a1a2e' }}>
            MY JOURNEYS
          </h1>
          <p className="font-inter" style={{ fontSize: 11, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.04em', marginTop: 6 }}>
            Your learning journeys and their current state
          </p>
        </div>
        <button
          onClick={() => router.push('/teacher/journeys/new')}
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
          NEW JOURNEY
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <span className="font-space font-bold" style={{ fontSize: 12, color: 'rgba(26,26,46,0.4)', letterSpacing: '0.1em' }}>
          {journeys.length} {journeys.length === 1 ? 'JOURNEY' : 'JOURNEYS'}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.65)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: 999,
          padding: '8px 16px',
          width: 220,
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ color: 'rgba(26,26,46,0.3)', fontSize: 13, flexShrink: 0 }}>⌕</span>
          <input
            className="font-inter"
            type="text"
            placeholder="Search journeys…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, color: 'rgba(26,26,46,0.7)', width: '100%',
            }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="font-space" style={{ fontSize: 11, color: 'rgba(26,26,46,0.25)', letterSpacing: '0.1em', marginTop: 48, textAlign: 'center' }}>
          LOADING…
        </div>
      ) : journeys.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 64, gap: 16 }}>
          <div className="font-space font-black" style={{ fontSize: 18, letterSpacing: '0.1em', color: '#1a1a2e' }}>
            Start your first journey
          </div>
          <p className="font-inter" style={{ fontSize: 13, color: 'rgba(26,26,46,0.45)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
            A journey connects a Google Classroom to a curriculum — your students explore big questions together, mission by mission.
          </p>
          <button
            onClick={() => router.push('/teacher/journeys/new')}
            className="font-space font-bold"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px',
              borderRadius: 999,
              fontSize: 11,
              letterSpacing: '0.12em',
              background: 'linear-gradient(120deg, #FF0080, #8B00FF)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 18px rgba(139,0,255,0.25)',
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, lineHeight: '1',
            }}>+</span>
            NEW JOURNEY
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(j => <JourneyCard key={j.id} journey={j} />)}
          <NewJourneyCard isFirst={false} />
        </div>
      )}
    </div>
  );
}
