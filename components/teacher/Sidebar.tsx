'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getTeacherName, clearTeacherSession } from '@/lib/teacher-store';
import { supabaseSignOut } from '@/lib/session';

interface Journey {
  id: string;
  title: string;
}

interface SidebarProps {
  journeys: Journey[];
}

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const StudentsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const JourneysIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function Sidebar({ journeys }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [journeysOpen, setJourneysOpen] = useState(true);

  useEffect(() => { setTeacherName(getTeacherName()); }, []);

  const initials = teacherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  async function handleSignOut() {
    clearTeacherSession();
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
    color: active ? '#fff' : 'rgba(232,232,240,0.45)',
    background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
    border: active ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textDecoration: 'none',
  });

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'rgba(7,7,15,0.96)',
      borderRight: '1px solid rgba(124,58,237,0.18)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Wordmark */}
      <div style={{ padding: '0 4px 24px' }}>
        <div className="font-space font-black tracking-widest" style={{
          fontSize: 15,
          background: 'linear-gradient(90deg, #FF0080, #7C3AED, #00D4FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          10X TEACHER
        </div>
        <div style={{ fontSize: 10, color: 'rgba(232,232,240,0.3)', letterSpacing: '0.1em', fontFamily: 'var(--font-space)', marginTop: 2 }}>
          EDUCATOR PORTAL
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Link href="/teacher" style={navItemStyle(pathname === '/teacher')}>
          <HomeIcon /> HOME
        </Link>

        <Link href="/teacher/progress" style={navItemStyle(isActive('/teacher/progress'))}>
          <StudentsIcon /> STUDENTS
        </Link>

        {/* Journeys expandable */}
        <button
          onClick={() => setJourneysOpen(o => !o)}
          style={{ ...navItemStyle(false), justifyContent: 'space-between', background: 'transparent', border: '1px solid transparent' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <JourneysIcon /> JOURNEYS
          </span>
          <ChevronIcon open={journeysOpen} />
        </button>

        <AnimatePresence>
          {journeysOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {journeys.map(j => {
                const active = isActive(`/teacher/journey/${j.id}`);
                return (
                  <Link key={j.id} href={`/teacher/journey/${j.id}`} style={{
                    ...navItemStyle(active),
                    fontSize: 11,
                    padding: '6px 10px',
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#00F5D4' : 'rgba(232,232,240,0.3)', flexShrink: 0 }} />
                    {j.title}
                  </Link>
                );
              })}
              {journeys.length === 0 && (
                <span style={{ fontSize: 10, color: 'rgba(232,232,240,0.25)', padding: '4px 10px', fontFamily: 'var(--font-space)' }}>
                  No journeys yet
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Teacher profile at bottom */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #00F5D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-space)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,232,240,0.8)', fontFamily: 'var(--font-space)' }}>
              {teacherName || 'Teacher'}
            </div>
            <button
              onClick={handleSignOut}
              style={{ fontSize: 9, color: 'rgba(255,0,128,0.6)', fontFamily: 'var(--font-space)', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
