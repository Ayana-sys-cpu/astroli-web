'use client';
import { motion } from 'framer-motion';

interface AvatarHeroProps {
  level?: number;
  trophies?: number;
  xpProgress?: number; // 0–1
  size?: number;
  onTrophyClick?: () => void;
  animate?: boolean;
  /** Real user avatar URL from Supabase/Cloudinary (mobile-synced).
   *  undefined = still loading, null = no avatar, string = show image */
  avatarUrl?: string | null;
}

export default function AvatarHero({
  level = 7,
  trophies = 42,
  xpProgress = 0.72,
  size = 150,
  onTrophyClick,
  animate: doAnimate = true,
  avatarUrl,
}: AvatarHeroProps) {
  const outerR = size / 2 - 4;
  const innerR = size / 2 - 12;
  const circumOuter = 2 * Math.PI * outerR;
  const circumInner = 2 * Math.PI * innerR;
  const badgeSize = Math.round(size * 0.28);
  const trophySize = Math.round(size * 0.27);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -size * 0.15,
          background: 'transparent',
          filter: 'blur(20px)',
        }}
        animate={doAnimate ? {
          boxShadow: [
            '0 0 40px rgba(255,0,128,0.25)',
            '0 0 70px rgba(255,0,128,0.45)',
            '0 0 40px rgba(255,0,128,0.25)',
          ],
        } : undefined}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── SVG rings ──────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden
      >
        {/* Outer track */}
        <circle
          cx={size / 2} cy={size / 2} r={outerR}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"
        />
        {/* Outer XP progress – magenta */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={outerR}
          fill="none"
          stroke="#FF0080"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumOuter}
          initial={{ strokeDashoffset: circumOuter }}
          animate={doAnimate ? { strokeDashoffset: circumOuter * (1 - xpProgress) } : undefined}
          transition={{ delay: 0.6, duration: 1.4, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px #FF0080)' }}
        />
        {/* Inner decoration ring – teal dashed */}
        <circle
          cx={size / 2} cy={size / 2} r={innerR}
          fill="none"
          stroke="rgba(0,245,212,0.2)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </svg>

      {/* ── Avatar body ─────────────────────────────────────────────── */}
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: 14,
          background: 'radial-gradient(circle at 40% 30%, #1d0033, #06000f 60%, #000308)',
          border: '1px solid rgba(0,245,212,0.25)',
          boxShadow: 'inset 0 0 30px rgba(0,245,212,0.08), inset 0 0 60px rgba(255,0,128,0.04)',
        }}
        initial={doAnimate ? { scale: 0.8, opacity: 0 } : undefined}
        animate={doAnimate ? { scale: 1, opacity: 1 } : undefined}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring', damping: 16 }}
      >
        {/* ── Avatar content: real image OR SVG character fallback ── */}
        {avatarUrl ? (
          /* Real user photo from Supabase/Cloudinary — mobile-synced */
          <motion.img
            key="real-avatar"
            src={avatarUrl}
            alt="Your avatar"
            initial={doAnimate ? { opacity: 0, scale: 1.1 } : undefined}
            animate={doAnimate ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover rounded-full"
            style={{ borderRadius: '50%' }}
          />
        ) : avatarUrl === undefined ? (
          /* Still loading — pulsing shimmer placeholder */
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(135deg, #0d001a, #001a15)' }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          /* No avatar yet — render the Brawl-Stars SVG character */
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
            <defs>
              <filter id="av-glow-t">
                <feGaussianBlur stdDeviation="2.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="av-glow-m">
                <feGaussianBlur stdDeviation="2.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {/* Crown / star */}
            <polygon
              points="50,5 53.5,15 64,15 55.5,21 58.5,32 50,26 41.5,32 44.5,21 36,15 46.5,15"
              fill="#FFD600" filter="url(#av-glow-t)" opacity="0.95"
            />
            {/* Head */}
            <circle cx="50" cy="41" r="16" fill="#00F5D4" filter="url(#av-glow-t)"/>
            <circle cx="43" cy="38" r="3.5" fill="#001a15"/>
            <circle cx="57" cy="38" r="3.5" fill="#001a15"/>
            <circle cx="44.2" cy="37" r="1.2" fill="#fff" opacity="0.9"/>
            <circle cx="58.2" cy="37" r="1.2" fill="#fff" opacity="0.9"/>
            <path d="M 44 44 Q 50 49 56 44" stroke="#001a15" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            {/* Body */}
            <path
              d="M 33 58 Q 33 51 50 51 Q 67 51 67 58 L 65 84 Q 65 88 50 88 Q 35 88 35 84 Z"
              fill="#FF0080" filter="url(#av-glow-m)"
            />
            <rect x="23" y="55" width="11" height="26" rx="5.5" fill="#FF0080" filter="url(#av-glow-m)"/>
            <rect x="66" y="55" width="11" height="26" rx="5.5" fill="#FF0080" filter="url(#av-glow-m)"/>
            <polygon
              points="50,60 51.8,65.5 57.5,65.5 53,68.8 54.8,74.3 50,71 45.2,74.3 47,68.8 42.5,65.5 48.2,65.5"
              fill="#FFD600" opacity="0.7"
            />
          </svg>
        )}
      </motion.div>

      {/* ── Level badge ─────────────────────────────────────────────── */}
      <motion.div
        className="absolute flex items-center justify-center text-black font-black rounded-full"
        style={{
          width: badgeSize,
          height: badgeSize,
          top: -2,
          right: -2,
          background: 'linear-gradient(135deg, #FF0080 0%, #ff4db3 100%)',
          boxShadow: '0 0 14px rgba(255,0,128,0.8), 0 2px 10px rgba(0,0,0,0.6)',
          fontSize: badgeSize * 0.38,
          fontFamily: 'var(--font-space)',
          border: '2px solid #000',
        }}
        initial={doAnimate ? { scale: 0, rotate: -20 } : undefined}
        animate={doAnimate ? { scale: 1, rotate: 0 } : undefined}
        transition={{ delay: 1, type: 'spring', damping: 12, stiffness: 220 }}
      >
        {level}
      </motion.div>

      {/* ── Trophy button ───────────────────────────────────────────── */}
      <motion.button
        onClick={onTrophyClick}
        className="absolute flex items-center gap-1 rounded-full cursor-pointer hover:border-yellow-400/60 transition-all"
        style={{
          width: trophySize,
          height: trophySize,
          bottom: -2,
          right: -2,
          background: '#0a0800',
          border: '1.5px solid rgba(255,214,0,0.4)',
          boxShadow: '0 0 10px rgba(255,214,0,0.18)',
          justifyContent: 'center',
        }}
        initial={doAnimate ? { scale: 0 } : undefined}
        animate={doAnimate ? { scale: 1 } : undefined}
        transition={{ delay: 1.2, type: 'spring', damping: 12 }}
      >
        <span style={{ fontSize: trophySize * 0.35 }}>🏆</span>
        <span
          style={{
            fontSize: trophySize * 0.28,
            color: '#FFD600',
            fontFamily: 'var(--font-space)',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {trophies}
        </span>
      </motion.button>
    </div>
  );
}
