'use client';
import Image from 'next/image';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import TiltPanel from './TiltPanel';
import Reveal from './Reveal';

interface Block {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  customVisual?: 'bot-convo' | 'reward-overlay';
  contrast?: { badLabel: string; badText: string; goodLabel: string; goodText: string };
  reverse?: boolean;
}

// ── Static bot conversation composite (mirrors PlanetVoicePanel design tokens) ──
const BOT_CONVO = [
  { who: 'figure', text: 'When iron combines with oxygen to form rust — does the total mass increase, decrease, or stay the same?' },
  { who: 'student', text: 'It decreases? Because the iron loses something?' },
  { who: 'figure', text: "Common instinct. Let's build on it — what happens to the total amount when you dissolve salt in water?" },
  { who: 'student', text: "Oh… it stays the same. The salt doesn't disappear." },
  { who: 'figure', text: 'Exactly. So when iron bonds with oxygen from the air…' },
  { who: 'student', text: 'The total mass stays the same — nothing appears or disappears.' },
];

function FigureOrb({ size = 22 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #d0c0ff, #7755bb 60%, #2a1a44)',
      border: '1px solid rgba(160,144,212,0.5)',
    }} />
  );
}

function BotConvoComposite() {
  return (
    <div style={{
      background: '#080808', borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minHeight: 340,
    }}>
      {/* Header strip */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.02)',
      }}>
        <FigureOrb size={18} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#a090d4', textTransform: 'uppercase' }}>
          Marie-Anne · Chemistry
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          color: 'rgba(0,212,212,0.7)', textTransform: 'uppercase',
          background: 'rgba(0,212,212,0.08)', border: '1px solid rgba(0,212,212,0.2)',
          borderRadius: 999, padding: '2px 8px',
        }}>
          Adapting
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BOT_CONVO.map((m, i) => (
          m.who === 'figure' ? (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0 12px' }}>
              <FigureOrb size={20} />
              <div style={{
                background: 'rgba(119,85,187,0.10)', border: '1px solid rgba(160,144,212,0.18)',
                borderRadius: '4px 12px 12px 12px', padding: '8px 12px', maxWidth: '85%',
              }}>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: '#8896a8', margin: 0 }}>{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 12px' }}>
              <div style={{
                background: 'rgba(160,144,212,0.10)', border: '1.5px solid rgba(160,144,212,0.25)',
                borderRadius: '12px 4px 12px 12px', padding: '8px 12px', maxWidth: '80%',
              }}>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: '#a090d4', margin: 0 }}>{m.text}</p>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Faux input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: '#111', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '8px 10px',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', flex: 1 }}>Ask anything…</span>
          <span style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: 'rgba(160,144,212,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', fontWeight: 800,
          }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ── Static reward overlay composite (mirrors CoinRewardModal) ──
function RewardOverlayComposite({ storeImg }: { storeImg: string }) {
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      {/* Store screenshot behind */}
      <Image
        src={storeImg}
        alt="Student store screen showing avatar cosmetics."
        width={2880}
        height={1560}
        className="w-full h-auto"
        style={{ display: 'block', filter: 'brightness(0.45) blur(1px)' }}
      />
      {/* Dark vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(84,23,190,0.45) 0%, rgba(9,6,20,0.82) 75%)',
      }} />
      {/* Modal card */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 260, background: 'rgba(26,29,46,0.92)',
          backdropFilter: 'blur(16px)', borderRadius: 20,
          border: '1px solid rgba(138,92,245,0.3)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          padding: '22px 20px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 14,
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 9999,
            background: 'rgba(49,53,60,0.6)', border: '1px solid rgba(58,74,72,0.4)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00f2ea', boxShadow: '0 0 6px #00f2ea' }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#b9cac8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Achievement Unlocked
            </span>
          </div>

          {/* Title */}
          <div>
            <h3 style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700,
              lineHeight: 1.1, color: '#29fcf3', textShadow: '0 0 10px rgba(207,255,251,0.3)', margin: '0 0 6px',
            }}>
              Planet Explored!
            </h3>
            <p style={{ fontSize: 12, color: 'rgba(185,202,200,0.75)', margin: 0, fontFamily: 'sans-serif' }}>
              You&apos;ve uncovered every secret on this planet.
            </p>
          </div>

          {/* Orbit graphic (simplified) */}
          <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: 0,
              border: '1px dashed rgba(0,242,234,0.3)', borderRadius: '50%',
            }} />
            <div style={{
              position: 'absolute', inset: 16,
              border: '1px dashed rgba(0,242,234,0.15)', borderRadius: '50%',
            }} />
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #00f2ea, #006a66)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,242,234,0.4)',
              fontSize: 22, color: '#003735',
            }}>✓</div>
          </div>

          {/* Coin amount */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '10px 20px', borderRadius: 9999,
            background: 'rgba(84,23,190,0.12)', border: '1px solid rgba(84,23,190,0.25)',
            width: '100%',
          }}>
            <span style={{ fontSize: 20, color: '#D4A017' }}>★</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: '#c0a7ff', fontFamily: 'Space Grotesk, sans-serif' }}>+150</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#849492', fontFamily: 'monospace' }}>COINS</span>
          </div>

          {/* CTA button */}
          <div style={{
            width: '100%', padding: '11px', borderRadius: 10,
            background: '#00f2ea', color: '#003735',
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 600,
            textAlign: 'center',
          }}>
            Claim Reward →
          </div>
        </div>
      </div>
    </div>
  );
}

const BLOCKS: Block[] = [
  {
    id: 'agency',
    eyebrow: 'Agency, Not Autopilot',
    title: 'Your kid is the scientist. Not the audience.',
    body: 'They choose which planet to visit, which anomaly to investigate, how deep to go. Orin never hands over the answer — it asks the question that gets them there themselves. What they discover on their own is what sticks.',
    accent: '#8B00FF',
    image: '/marketing/landscape.png',
    imageWidth: 2880,
    imageHeight: 1560,
    alt: 'The Astroli planets map — an interactive galaxy of missions a student controls.',
  },
  {
    id: 'pacing',
    eyebrow: 'Adaptive Pacing',
    title: 'One-size-fits-all curriculum → adaptive pacing, per student',
    body: "Traditional classrooms move every kid at the same speed. Astroli's Planet Bots adjust complexity and pace to each student in real time — never bored, never drowning, always working right at the edge of what they can do.",
    accent: '#00FF88',
    customVisual: 'bot-convo',
    reverse: true,
  },
  {
    id: 'reward',
    eyebrow: 'Dopamine & Reward-Based Learning',
    title: 'Teen brains learn through trial and reward',
    body: "Adolescence is when the brain's reward system is most active — teenagers learn fastest through trial, effort, and payoff. Astroli channels that same dopamine-driven drive into real progress: rewards and avatar customisation earned by solving something, not by scrolling.",
    accent: '#FF0080',
    image: '/marketing/store.png',
    imageWidth: 2880,
    imageHeight: 1560,
    alt: 'A student store screen showing avatar cosmetics unlocked through earned rewards.',
    customVisual: 'reward-overlay',
    contrast: {
      badLabel: 'Social Media',
      badText: 'Random notifications. A ping for anything, nothing earned.',
      goodLabel: 'Astroli',
      goodText: 'The same instant-reward feeling — but every unlock is earned.',
    },
    reverse: true,
  },
];

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function MissionBlock({ block }: { block: Block }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-24, 24]);

  return (
    <motion.div
      id={block.id}
      ref={ref}
      className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center relative"
      variants={reduceMotion ? undefined : CONTAINER}
      initial={reduceMotion ? undefined : 'hidden'}
      whileInView={reduceMotion ? undefined : 'show'}
      viewport={{ once: true, margin: '-80px' }}
    >
      {/* Text card */}
      <div className={block.reverse ? 'md:order-1' : 'md:order-2'}>
        <div
          className="rounded-3xl p-8 md:p-10 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${block.accent}30`, borderLeft: `3px solid ${block.accent}` }}
        >
          <motion.span
            className="block font-space text-[11px] uppercase tracking-[0.18em] font-bold"
            style={{ color: block.accent }}
            variants={reduceMotion ? undefined : ITEM}
          >
            {block.eyebrow}
          </motion.span>
          <motion.h3 className="font-space font-bold text-2xl md:text-3xl" variants={reduceMotion ? undefined : ITEM}>
            {block.title}
          </motion.h3>
          <motion.p className="text-white/60 leading-relaxed font-inter" variants={reduceMotion ? undefined : ITEM}>
            {block.body}
          </motion.p>
          {block.contrast && (
            <motion.div
              className="grid grid-cols-2 gap-3 pt-2"
              variants={reduceMotion ? undefined : ITEM}
            >
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="block font-space text-[10px] uppercase tracking-widest mb-1 text-white/35">{block.contrast.badLabel}</span>
                <span className="text-[13px] text-white/45 font-inter leading-snug">{block.contrast.badText}</span>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,0,128,0.06)', border: `1px solid ${block.accent}40` }}>
                <span className="block font-space text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: block.accent }}>{block.contrast.goodLabel}</span>
                <span className="text-[13px] text-white/80 font-inter leading-snug">{block.contrast.goodText}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Visual panel */}
      <motion.div className={block.reverse ? 'md:order-2' : 'md:order-1'} variants={reduceMotion ? undefined : ITEM} style={{ y: parallaxY }}>
        <TiltPanel
          strength={5}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${block.accent}33`,
            boxShadow: `0 0 50px ${block.accent}1a`,
            padding: 10,
          }}
        >
          <div className="rounded-2xl overflow-hidden">
            {block.customVisual === 'bot-convo' ? (
              <BotConvoComposite />
            ) : block.customVisual === 'reward-overlay' && block.image ? (
              <RewardOverlayComposite storeImg={block.image} />
            ) : block.image ? (
              <Image
                src={block.image}
                alt={block.alt ?? ''}
                width={block.imageWidth ?? 2880}
                height={block.imageHeight ?? 1560}
                className="w-full h-auto"
              />
            ) : null}
          </div>
        </TiltPanel>
      </motion.div>
    </motion.div>
  );
}

export default function MissionArchitecture() {
  return (
    <section className="max-w-[1280px] mx-auto px-6 md:px-16 py-24 md:py-32 space-y-8">
      <Reveal className="text-center max-w-2xl mx-auto space-y-4 mb-20">
        <span className="font-space text-[11px] uppercase tracking-[0.24em] text-teal">How It Works</span>
        <h2 className="font-space font-bold text-3xl md:text-5xl">Built on how teenage brains actually learn</h2>
      </Reveal>
      <div className="space-y-20 md:space-y-28">
        {BLOCKS.map((block) => (
          <MissionBlock key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}
