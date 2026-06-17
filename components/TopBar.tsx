'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_STUDENT_USER } from '@/lib/dev/mock-student-user';
import { clearSession } from '@/lib/student-store';
import { supabaseSignOut } from '@/lib/session';

interface TopBarProps {
  left?: string;
  center?: string;
  showUser?: boolean;
}

export default function TopBar({ left, center, showUser = true }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSignOut = () => {
    clearSession();                  // clears display-layer localStorage
    supabaseSignOut().catch(() => {}); // revokes server session (fire-and-forget)
    router.push('/');
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
      <span className="text-[10px] tracking-[0.22em] text-white/35 font-space uppercase">
        {left ?? 'MISSION 03 · WHO OWNS THE TRUTH?'}
      </span>

      {center && (
        <span className="absolute left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-[#00C4CC]/70 font-space uppercase">
          {center}
        </span>
      )}

      {showUser && (
        <div className="relative flex items-center gap-2" ref={menuRef}>
          <span className="text-[11px] text-white/40 font-space">{MOCK_STUDENT_USER.displayName}</span>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="w-6 h-6 rounded-full border border-[#00C4CC]/50 flex items-center justify-center bg-[#001820] cursor-pointer hover:border-[#00C4CC] transition-colors"
          >
            <span className="text-[9px] text-[#00C4CC] font-space font-bold">
              {MOCK_STUDENT_USER.firstName[0]}
            </span>
          </button>

          {menuOpen && (
            <div
              className="absolute top-8 right-0 w-40 rounded-lg overflow-hidden z-50"
              style={{
                background: 'rgba(0,10,18,0.95)',
                border: '1px solid rgba(0,196,204,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-[11px] tracking-[0.15em] font-space text-white/60 hover:text-white hover:bg-white/5 transition-colors uppercase"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
