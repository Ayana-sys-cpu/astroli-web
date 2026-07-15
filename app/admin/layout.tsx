'use client';

// Shell for the founder's Pilot Review Dashboard: shared header + tab nav.
// Access is enforced server-side by middleware.ts (ADMIN_EMAIL guard on
// /admin/*); every /api/admin/* route additionally calls requireAdmin().
// Spec: specs/founder/web-app/pilot-review-dashboard/

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const ADMIN_TABS = [
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/families', label: 'Families' },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <header className="flex items-center gap-6 px-8 py-4 border-b border-white/8">
        <span className="font-mono font-bold text-sm tracking-widest text-white/60">ASTROLI ADMIN</span>
        <nav className="flex gap-1">
          {ADMIN_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-1.5 rounded-md text-xs font-medium tracking-[0.12em] uppercase transition-colors ${
                  active ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <a href="/" className="text-[11px] text-white/40 hover:text-white/70 tracking-widest uppercase">← Exit</a>
      </header>
      {children}
    </div>
  );
}
