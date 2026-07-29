'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFirstName, clearSession } from '@/lib/student-store';
import { supabaseSignOut } from '@/lib/session';
import StoreButton, { type StoreButtonMode } from '@/components/StoreButton';
import { t, type BackLabelKey, type Lang } from '@/lib/i18n';
import type { ReactNode } from 'react';

export interface StudentHeaderBack {
  label: BackLabelKey;
  href: string;
}

interface StudentHeaderProps {
  /** Top-level screen: renders the Home · Master links with this one active. */
  nav?: 'home' | 'master';
  /** Deep screen: renders a single labelled back pill. Wins if both are set. */
  back?: StudentHeaderBack;
  /** Uppercase micro-label after the nav/back slot. Truncates; hidden under 400px. */
  context?: string;
  /** Centred node, md+ only. */
  center?: ReactNode;
  store?: StoreButtonMode | 'hidden';
  /** Which back label /store shows when opened from this screen. */
  storeOriginLabel?: BackLabelKey;
  initials?: string;
  lang?: Lang;
  /**
   * `false` renders the wordmark as inert text. Used by teacher preview of a
   * student map, where sending the viewer to a student's home is wrong.
   */
  wordmarkLinksHome?: boolean;
}

const TEAL = '#00F5D4';
const MAGENTA = '#FF3D9A';
const WORDMARK_CLASS = 'font-space font-black text-xs sm:text-sm tracking-[0.22em] gradient-wordmark shrink-0';

function initialFromLocalName(): string {
  return getFirstName().trim()[0]?.toUpperCase() ?? 'A';
}

export default function StudentHeader({
  nav,
  back,
  context,
  center,
  store = 'compact',
  storeOriginLabel = 'backHome',
  initials,
  lang = 'en',
  wordmarkLinksHome = true,
}: StudentHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localInitial, setLocalInitial] = useState('A');
  const menuRef = useRef<HTMLDivElement>(null);

  // Local storage is unavailable during SSR, so the fallback initial resolves
  // after mount rather than at render.
  useEffect(() => {
    if (!initials) setLocalInitial(initialFromLocalName());
  }, [initials]);

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

  const avatarInitials = initials ?? localInitial;

  const navLink = (target: 'home' | 'master') => {
    const active = nav === target;
    return (
      <button
        onClick={() => router.push(target === 'home' ? '/home' : '/master')}
        className="font-space text-[12.5px] transition-colors px-1 py-3 -my-2.5"
        style={{
          color: active ? TEAL : 'rgba(255,255,255,0.62)',
          fontWeight: active ? 700 : 400,
          borderBottom: active ? `1.5px solid ${TEAL}` : '1.5px solid transparent',
        }}
        aria-current={active ? 'page' : undefined}
      >
        {t(target === 'home' ? 'navHome' : 'navMaster', lang)}
      </button>
    );
  };

  return (
    /* min-h rather than padding: every control pulls its own layout box in with
       a negative margin so its 44px tap area doesn't stretch the bar. */
    <header className="safe-top sticky top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-5 min-h-[52px] border-b border-white/5 bg-black/70 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        {wordmarkLinksHome ? (
          <button
            onClick={() => router.push('/home')}
            className={WORDMARK_CLASS}
            aria-label="Go to home"
          >
            ASTROLI
          </button>
        ) : (
          <span className={WORDMARK_CLASS}>ASTROLI</span>
        )}

        {/* The outer button carries a full-bar-height tap area; the inner span
            is the visible pill, so the target grows without the pill growing. */}
        {back ? (
          <button
            onClick={() => router.push(back.href)}
            className="group flex items-center shrink-0 py-[6px] my-[-10px]"
          >
            <span
              className="flex items-center px-3 py-1.5 rounded-full text-[11px] font-space tracking-[0.06em] font-semibold transition-colors group-hover:bg-[rgba(255,61,154,.16)]"
              style={{ border: '1px solid rgba(255,61,154,0.45)', background: 'rgba(255,61,154,.08)', color: MAGENTA }}
            >
              {t(back.label, lang)}
            </span>
          </button>
        ) : nav ? (
          <nav className="flex items-center gap-3.5 shrink-0">
            {navLink('home')}
            {navLink('master')}
          </nav>
        ) : null}

        {/* First thing to drop — the back pill, coins and avatar keep the room. */}
        {context && (
          <span className="hidden min-[400px]:inline text-[10px] font-semibold tracking-[0.22em] text-white/55 font-space uppercase truncate max-w-[30vw] md:max-w-[45vw]">
            {context}
          </span>
        )}
      </div>

      {/* Collides with the side controls on phones — md+ only */}
      {center && (
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          {center}
        </div>
      )}

      <div className="relative flex items-center gap-2.5 shrink-0" ref={menuRef}>
        {store !== 'hidden' && (
          <StoreButton mode={store} lang={lang} originLabel={storeOriginLabel} />
        )}

        {/* 44px hit area (negative margin keeps the bar's rhythm); circle stays 24px. */}
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Account menu"
          className="w-11 h-11 -m-2.5 flex items-center justify-center cursor-pointer group"
        >
          <span className="w-6 h-6 rounded-full border border-[#00F5D4]/50 flex items-center justify-center bg-[#001820] group-hover:border-[#00F5D4] transition-colors">
            <span className="text-[9px] text-[#00F5D4] font-space font-bold">
              {avatarInitials}
            </span>
          </span>
        </button>

        {menuOpen && (
          <div
            className="absolute top-8 right-0 w-40 rounded-lg overflow-hidden z-50"
            style={{
              background: 'rgba(0,10,18,0.95)',
              border: '1px solid rgba(0,245,212,0.2)',
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
      </div>
    </header>
  );
}
