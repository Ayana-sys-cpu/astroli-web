'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AttentionSignalType = 'grace_completion' | 'stuck' | 'non_engagement';

export interface AttentionStudent {
  studentId: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  phoneNumber: string | null;
  signalType: AttentionSignalType;
  signalCreatedAt: string;
  contextLine: string;
  acknowledged: boolean;
}

function extractPlanetName(ctx: string): string | null {
  const m = ctx.match(/\b(Planet \w+)\b/i);
  return m?.[1] ?? null;
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

const SIGNAL_CONFIG: Record<
  AttentionSignalType,
  { icon: string; label: string; color: string; border: string; template: (name: string, context: string) => string }
> = {
  grace_completion: {
    icon: '🔴',
    label: 'Grace completion',
    color: '#DC2626',
    border: 'rgba(220,38,38,0.3)',
    template: (name, ctx) => {
      const planet = extractPlanetName(ctx) ?? 'a recent planet';
      return `Hey ${name}, I saw you worked through ${planet}. Want to find 2 minutes to chat about it now? I have an idea for a different angle.`;
    },
  },
  stuck: {
    icon: '🔄',
    label: 'Stuck',
    color: '#0369A1',
    border: 'rgba(14,165,233,0.3)',
    template: (name, ctx) => {
      const planet = extractPlanetName(ctx);
      const ref = planet ? `on ${planet}` : 'working through this';
      return `Hey ${name}, I can see you've been spending real time ${ref}. You're close — want a quick hint to unlock it?`;
    },
  },
  non_engagement: {
    icon: '⚠️',
    label: 'Not engaging',
    color: '#D97706',
    border: 'rgba(217,119,6,0.3)',
    template: (name, _ctx) =>
      `Hey ${name}, I can see you haven't jumped in yet — everything okay? I'm here if you need a nudge to get started.`,
  },
};

function avatarColor(id: string): string {
  const colors = ['#8B00FF', '#FF0080', '#0EA5E9', '#00F5D4', '#F59E0B'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

interface AttentionCardProps {
  student: AttentionStudent;
  onAcknowledge: (studentId: string) => void;
}

export default function AttentionCard({ student, onAcknowledge }: AttentionCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const cfg = SIGNAL_CONFIG[student.signalType];

  function handleWhatsApp() {
    const msg = encodeURIComponent(cfg.template(student.name, student.contextLine));
    const phone = student.phoneNumber ? student.phoneNumber.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }

  function handleOnIt() {
    setDismissed(true);
    setTimeout(() => onAcknowledge(student.studentId), 350);
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="glass-card"
          style={{
            border: `1px solid ${cfg.border}`,
            padding: '18px 20px',
            marginBottom: 12,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: student.avatarUrl ? undefined : avatarColor(student.studentId),
              backgroundImage: student.avatarUrl ? `url(${student.avatarUrl})` : undefined,
              backgroundSize: 'cover',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'var(--font-space-mono)',
            }}
          >
            {!student.avatarUrl && student.initials}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span className="font-inter" style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>
                {student.name}
              </span>
              <span className="font-space" style={{ fontSize: 10, color: cfg.color, letterSpacing: '0.06em' }}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="font-inter" style={{ fontSize: 11, color: 'rgba(26,26,46,0.35)', marginLeft: 'auto' }}>
                {relativeTime(student.signalCreatedAt)}
              </span>
            </div>
            <p className="font-inter" style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)', lineHeight: 1.5, marginBottom: 14 }}>
              {student.contextLine}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                aria-label="WhatsApp"
                onClick={handleWhatsApp}
                className="font-space font-bold"
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  background: 'rgba(37,211,102,0.1)',
                  color: '#059669',
                  border: '1px solid rgba(37,211,102,0.3)',
                  cursor: 'pointer',
                }}
              >
                💬 WhatsApp
              </button>
              <button
                aria-label="On it"
                onClick={handleOnIt}
                className="font-space font-bold"
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  background: 'rgba(26,26,46,0.04)',
                  color: 'rgba(26,26,46,0.4)',
                  border: '1px solid rgba(26,26,46,0.1)',
                  cursor: 'pointer',
                }}
              >
                On it ✓
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
