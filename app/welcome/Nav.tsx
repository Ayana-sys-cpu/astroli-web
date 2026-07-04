'use client';
import { useEffect, useState } from 'react';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSignup = () => {
    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className="fixed top-0 w-full z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(7,7,15,0.72)' : 'rgba(7,7,15,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
      }}
    >
      <div className="flex justify-between items-center px-6 md:px-16 max-w-[1280px] mx-auto transition-all duration-300" style={{ paddingTop: scrolled ? 14 : 22, paddingBottom: scrolled ? 14 : 22 }}>
        <span className="gradient-wordmark font-space font-black text-xl tracking-[0.1em]">ASTROLI</span>
        <div className="hidden md:flex items-center gap-8">
          <a href="#mission" className="font-space text-[11px] uppercase tracking-[0.16em] text-white/50 hover:text-white transition-colors">Mission Concept</a>
          <a href="#agency" className="font-space text-[11px] uppercase tracking-[0.16em] text-white/50 hover:text-white transition-colors">Your Kid is the Scientist</a>
          <a href="#intrinsic" className="font-space text-[11px] uppercase tracking-[0.16em] text-white/50 hover:text-white transition-colors">No Grades</a>
          <a href="#reward" className="font-space text-[11px] uppercase tracking-[0.16em] text-white/50 hover:text-white transition-colors">Rewards</a>
        </div>
        <button
          onClick={scrollToSignup}
          className="font-space text-[11px] uppercase tracking-[0.16em] font-bold px-5 py-2.5 rounded-lg text-white transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)' }}
        >
          Start Free Trial
        </button>
      </div>
    </nav>
  );
}
