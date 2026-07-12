'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_STUDENT_USER } from '@/lib/dev/mock-student-user';
import { clearSession } from '@/lib/student-store';
import { supabaseSignOut } from '@/lib/session';
import StoreButton from '@/components/StoreButton';
import { t, type Lang } from '@/lib/i18n';
import type { ReactNode } from 'react';

interface TopBarProps {
  left?: string;
  center?: ReactNode;
  showUser?: boolean;
  showHome?: boolean;
  showStore?: boolean;
  backToMap?: string;
  initials?: string;
  lang?: Lang;
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/[\s.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.[0]?.toUpperCase() ?? 'A';
}

export default function TopBar({ left, center, showUser = true, showHome = true, showStore = false, backToMap, initials, lang = 'en' }: TopBarProps) {
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
    clearSession();
    supabaseSignOut().catch(() => {});
    router.push('/');
  };

  const avatarInitials = initials ?? getInitials(MOCK_STUDENT_USER.displayName);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {showHome && (
          <button
            onClick={() => router.push('/home')}
            className="font-space font-black text-sm tracking-[0.22em] gradient-wordmark"
            aria-label="Go to home"
          >
            ASTROLI
          </button>
        )}
        {backToMap ? (
          <button
            onClick={() => router.push(backToMap)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-space tracking-[0.12em] font-semibold uppercase transition-all"
            style={{
              border: '1px solid rgba(255,45,120,.4)',
              background: 'rgba(255,45,120,.08)',
              color: '#FF2D78',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,45,120,.16)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,45,120,.08)'; }}
          >
            {t('backToMap', lang)}
          </button>
        ) : left ? (
          <span className="text-[10px] font-semibold tracking-[0.22em] text-white/55 font-space uppercase">
            {left}
          </span>
        ) : null}
      </div>

      {center && (
        <div className="absolute left-1/2 -translate-x-1/2">
          {center}
        </div>
      )}

      {(showStore || showUser) && (
        <div className="relative flex items-center gap-2.5" ref={menuRef}>
          {showStore && <StoreButton />}
          {showUser && (
            <>
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="w-6 h-6 rounded-full border border-[#00C4CC]/50 flex items-center justify-center bg-[#001820] cursor-pointer hover:border-[#00C4CC] transition-colors"
              >
                <span className="text-[9px] text-[#00C4CC] font-space font-bold">
                  {avatarInitials}
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
                    {t('signOut', lang)}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
