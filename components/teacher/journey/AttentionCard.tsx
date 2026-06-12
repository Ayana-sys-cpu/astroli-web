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

const SIGNAL_CONFIG: Record<
  AttentionSignalType,
  { icon: string; label: string; color: string; border: string; template: (name: string, context: string) => string }
> = {
  grace_completion: {
    icon: '🔴',
    label: 'Grace',
    color: '#FF0080',
    border: 'rgba(255,0,128,0.35)',
    template: (name, _ctx) =>
      `Hey ${name}, I saw you worked through Planet X. Want to find 2 minutes to chat about it now? I have an idea for a different angle.`,
  },
  stuck: {
    icon: '🔄',
    label: 'Stuck',
    color: '#00F5D4',
    border: 'rgba(0,245,212,0.35)',
    template: (name, _ctx) =>
      `Hey ${name}, I can see you've been spending real time on this. You're close — want a quick hint to unlock it?`,
  },
  non_engagement: {
    icon: '⚠️',
    label: 'Not engaging',
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.4)',
    template: (name, _ctx) =>
      `Hey ${name}, I can see you haven't jumped in yet — everything okay? I'm here if you need a nudge to get started.`,
  },
};

function avatarColor(id: string): string {
  const colors = ['#7C3AED', '#FF0080', '#00D4FF', '#00F5D4', '#FFD600'];
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
          initial={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: `1px solid ${cfg.border}`,
            borderRadius: 14,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="font-inter" style={{ fontSize: 15, fontWeight: 600, color: '#E8E8F0' }}>
                {student.name}
              </span>
              <span className="font-space" style={{ fontSize: 10, color: cfg.color, letterSpacing: '0.06em' }}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <p className="font-inter" style={{ fontSize: 13, color: 'rgba(232,232,240,0.55)', lineHeight: 1.5, marginBottom: 14 }}>
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
                  background: 'rgba(37,211,102,0.15)',
                  color: '#25D366',
                  border: '1px solid rgba(37,211,102,0.35)',
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
                  background: 'rgba(232,232,240,0.06)',
                  color: 'rgba(232,232,240,0.5)',
                  border: '1px solid rgba(232,232,240,0.12)',
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
