'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { SpotlightStudent } from '@/app/api/teacher/homescreen/route';
import KineticText from '@/components/KineticText';

const SIGNAL_CONFIG = {
  breakthrough:    { icon: '🌟', label: 'Breakthrough',    color: '#FFD600', glow: 'rgba(255,214,0,0.3)',    border: 'rgba(255,214,0,0.35)' },
  grace_completion:{ icon: '🔴', label: 'Grace Completion', color: '#FF0080', glow: 'rgba(255,0,128,0.25)',  border: 'rgba(255,0,128,0.4)'  },
  stuck:           { icon: '🔄', label: 'Stuck',           color: '#00F5D4', glow: 'rgba(0,245,212,0.25)',  border: 'rgba(0,245,212,0.35)' },
  non_engagement:  { icon: '⚠️', label: 'Check In',       color: '#7C3AED', glow: 'rgba(124,58,237,0.25)', border: 'rgba(124,58,237,0.4)' },
} as const;

function avatarColor(id: string): string {
  const colors = ['#7C3AED', '#FF0080', '#00D4FF', '#00F5D4', '#FFD600', '#8B00FF'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

interface SpotlightCardProps {
  student: SpotlightStudent;
  onDone: () => void;
  onDismiss: () => void;
  onWhatsApp: () => void;
  onFlag: () => void;
}

export default function SpotlightCard({ student, onDone, onDismiss, onWhatsApp, onFlag }: SpotlightCardProps) {
  const [actioned, setActioned] = useState(false);
  const cfg = SIGNAL_CONFIG[student.signalType];

  function handleDone() { setActioned(true); setTimeout(onDone, 400); }
  function handleDismiss() { setActioned(true); setTimeout(onDismiss, 400); }

  const whatsappTemplates: Record<string, string> = {
    breakthrough: `Hey ${student.name} — I just wanted to say, your work lately has been genuinely impressive. You went really deep on this one.`,
    grace_completion: `Hey ${student.name}, I saw you worked through the last planet. I'd love to find 5 minutes to chat about it — I think there's a cool angle we haven't explored yet.`,
    stuck: `Hey ${student.name} — I can see you've been spending real time on this. I have a feeling you're closer to the big idea than you think. Want a nudge?`,
    non_engagement: `Hey ${student.name}, just thinking of you — noticed you haven't been around lately. Everything okay? I'm here if you need anything.`,
  };

  function handleWhatsApp() {
    const msg = encodeURIComponent(whatsappTemplates[student.signalType]);
    const phone = student.phoneNumber ? student.phoneNumber.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
    onWhatsApp();
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: actioned ? 0 : 1, x: actioned ? 12 : 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="glass-card"
      style={{
        border: `1px solid ${cfg.border}`,
        padding: '20px 24px',
        boxShadow: `0 2px 12px rgba(139,0,255,0.05), 0 0 20px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.9)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Student info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.name}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cfg.color}` }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${avatarColor(student.studentId)}cc, ${avatarColor(student.studentId)}66)`,
              border: `2px solid ${cfg.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-space)',
            }}>
              {student.initials}
            </div>
          )}
          {/* Signal badge */}
          <div style={{
            position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
            background: `rgba(${cfg.color === '#FFD600' ? '245,158,11' : cfg.color === '#FF0080' ? '255,0,128' : cfg.color === '#00F5D4' ? '0,245,212' : '139,0,255'}, 0.1)`,
            border: `1px solid ${cfg.border}`,
            borderRadius: 20, padding: '2px 8px',
            fontSize: 9, fontFamily: 'var(--font-space)', fontWeight: 700,
            color: cfg.color, letterSpacing: '0.06em', whiteSpace: 'nowrap',
            boxShadow: `0 0 6px ${cfg.glow}`,
          }}>
            {cfg.icon} {cfg.label.toUpperCase()}
          </div>
        </div>

        {/* Name + insight */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-space)', color: '#1a1a2e', marginBottom: 6 }}>
            {student.name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(26,26,46,0.65)', lineHeight: 1.5, fontFamily: 'var(--font-inter)' }}>
            <KineticText text={student.insightLine} delay={0.3} />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onFlag} style={btnStyle('rgba(26,26,46,0.05)', 'rgba(26,26,46,0.6)')}>
          🚩 Flag for follow-up
        </button>
        <button onClick={handleWhatsApp} style={btnStyle('rgba(0,245,212,0.08)', '#00897B')}>
          💬 WhatsApp {student.name.split(' ')[0]}
        </button>
      </div>

      {/* Done / Dismiss */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(26,26,46,0.08)', paddingTop: 12 }}>
        <button onClick={handleDone} style={btnStyle('rgba(5,150,105,0.08)', '#059669')}>
          ✅ Done
        </button>
        <button onClick={handleDismiss} style={btnStyle('rgba(26,26,46,0.04)', 'rgba(26,26,46,0.35)')}>
          ✖ Not now
        </button>
      </div>
    </motion.div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg || 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${color}33`,
    color,
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 11,
    fontFamily: 'var(--font-space)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };
}
