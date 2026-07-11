'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseSignOut } from '@/lib/session';

const AVATAR_COLORS = [
  '#4b5563', '#db2777', '#c2410c', '#0f766e',
  '#7c3aed', '#4338ca', '#15803d', '#1d4ed8', '#be123c',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const JourneysIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

interface Journey {
  id: string;
  title: string;
}

interface ParentSidebarProps {
  childName: string | null;
  childId: string;
  journeys: Journey[];
}

export default function ParentSidebar({ childName, childId, journeys }: ParentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [journeysOpen, setJourneysOpen] = useState(false);

  const initials = (childName ?? '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const color = avatarColor(childId);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  async function handleSignOut() {
    await supabaseSignOut().catch(() => {});
    router.replace('/');
  }

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'var(--font-space)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: active ? '#1a1a2e' : 'rgba(26,26,46,0.45)',
    background: active ? 'rgba(139,0,255,0.08)' : 'transparent',
    border: active ? '1px solid rgba(139,0,255,0.2)' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textDecoration: 'none',
  });

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(139,0,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
    }}>
      {/* Wordmark */}
      <div style={{ padding: '0 4px 24px' }}>
        <div
          className="font-space font-black tracking-widest"
          style={{
            fontSize: 15,
            background: 'linear-gradient(90deg, #FF0080, #7C3AED, #00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ASTROLI
        </div>
        <div style={{
          fontSize: 10,
          color: 'rgba(26,26,46,0.3)',
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-space)',
          marginTop: 2,
        }}>
          FAMILY PORTAL
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Link href="/parent/dashboard" style={navItemStyle(isActive('/parent/dashboard'))}>
          <HomeIcon /> HOME
        </Link>

        {/* Journeys — label navigates, chevron toggles sub-list */}
        <div style={{
          display: 'flex', alignItems: 'center', borderRadius: 8, overflow: 'hidden',
          background: isActive('/parent/journeys') ? 'rgba(139,0,255,0.08)' : 'transparent',
          border: isActive('/parent/journeys') ? '1px solid rgba(139,0,255,0.2)' : '1px solid transparent',
        }}>
          <Link
            href="/parent/journeys"
            style={{ ...navItemStyle(isActive('/parent/journeys')), flex: 1, background: 'transparent', border: 'none', borderRadius: 0 }}
          >
            <JourneysIcon /> JOURNEYS
          </Link>
          {journeys.length > 0 && (
            <button
              onClick={() => setJourneysOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 10px',
                color: isActive('/parent/journeys') ? '#1a1a2e' : 'rgba(26,26,46,0.45)',
                display: 'flex', alignItems: 'center',
                transition: 'transform 0.2s',
                transform: journeysOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
              aria-label={journeysOpen ? 'Collapse journeys' : 'Expand journeys'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}
        </div>

        {journeysOpen && journeys.length > 0 && (
          <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {journeys.map(j => (
              <Link key={j.id} href="/parent/journeys" style={{
                ...navItemStyle(false),
                fontSize: 11,
                padding: '6px 10px',
                fontWeight: 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(139,0,255,0.3)', flexShrink: 0 }} />
                {j.title}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Child profile at bottom */}
      <div style={{ borderTop: '1px solid rgba(26,26,46,0.08)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.92)',
            fontFamily: 'var(--font-space)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(26,26,46,0.8)', fontFamily: 'var(--font-space)' }}>
              {childName ?? 'Your child'}
            </div>
            <button
              onClick={handleSignOut}
              style={{
                fontSize: 9, color: 'rgba(255,0,128,0.6)',
                fontFamily: 'var(--font-space)', letterSpacing: '0.08em',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
