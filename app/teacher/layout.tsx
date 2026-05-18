'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { isTeacherSession, clearTeacherSession, getTeacherName } from '@/lib/teacher-store';
import StarField from '@/components/StarField';

const NAV = [
  { label: 'MISSION CONTROL', href: '/teacher' },
  { label: 'PROGRESS MATRIX', href: '/teacher/progress' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [name, setName] = useState('');

  useEffect(() => { setName(getTeacherName()); }, []);

  useEffect(() => {
    if (!isTeacherSession()) {
      router.replace('/');
    }
  }, [router]);

  function handleSignOut() {
    clearTeacherSession();
    router.replace('/');
  }

  return (
    <div className="min-h-screen" style={{ background: '#07070D', color: '#E8E8F0' }}>
      <StarField count={80} />

      {/* Top nav */}
      <header
        className="relative z-20 flex items-center justify-between px-8"
        style={{
          height: 60,
          borderBottom: '1px solid rgba(124,58,237,0.25)',
          background: 'rgba(7,7,13,0.92)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-8">
          {/* Wordmark */}
          <span
            className="font-space font-black tracking-widest select-none"
            style={{
              fontSize: 18,
              background: 'linear-gradient(90deg, #FF0080, #7C3AED, #00D4FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ASTROLI
          </span>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {NAV.map(({ label, href }) => {
              const active = pathname === href || (href !== '/teacher' && pathname.startsWith(href));
              return (
                <Link key={href} href={href}>
                  <motion.span
                    whileHover={{ color: '#fff' }}
                    className="relative px-4 py-1.5 text-[11px] font-space font-bold tracking-[0.15em] rounded-md transition-colors"
                    style={{ color: active ? '#fff' : 'rgba(232,232,240,0.45)', cursor: 'pointer' }}
                  >
                    {active && (
                      <motion.span
                        layoutId="teacher-nav-pill"
                        className="absolute inset-0 rounded-md"
                        style={{ background: 'rgba(124,58,237,0.22)', border: '1px solid rgba(124,58,237,0.4)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </motion.span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: name + sign out */}
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-space text-white/40 tracking-wide">{name}</span>
          <button
            onClick={handleSignOut}
            className="text-[10px] font-space tracking-widest px-3 py-1.5 rounded"
            style={{ border: '1px solid rgba(255,0,128,0.3)', color: 'rgba(255,0,128,0.7)' }}
          >
            SIGN OUT
          </button>
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
