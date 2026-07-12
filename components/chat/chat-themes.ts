// =============================================================================
// Chat theme contracts + per-panel presets.
// The shared chat components (ChatAvatarOrb, ChatTypingIndicator,
// CharacterMessageBubble, StudentMessageBubble, ChatInputDock) own all
// geometry — spacing, radii, typography, animation timing. Panels only pick
// a theme, so every chat surface stays visually consistent by construction.
// =============================================================================

export interface ChatOrbTheme {
  /** Full CSS background, e.g. 'radial-gradient(circle at 35% 35%, …)' */
  gradient: string;
  borderColor: string;
  /** When set, the orb gets a static glow scaled to its size. */
  glowColor?: string;
  /** Full CSS animation shorthand, e.g. 'figOrbPulse 3s ease-in-out infinite'. */
  pulseAnimation?: string;
}

export interface CharacterBubbleTheme {
  background: string;
  borderColor: string;
  /** Name label + typing-indicator dots. */
  accentColor: string;
  textColor: string;
  /** Colored left edge (e.g. Orin's green stripe on planet pages). */
  leftEdgeColor?: string;
  /** Full CSS box-shadow value. */
  glow?: string;
}

/** Everything needed to render one non-student speaker (orin or a figure). */
export interface ChatSpeakerTheme {
  orb: ChatOrbTheme;
  bubble: CharacterBubbleTheme;
}

export interface StudentBubbleTheme {
  background: string;
  borderColor: string;
  textColor: string;
}

export interface ChatInputTheme {
  surface: string;
  borderColor: string;
  textColor: string;
  caretColor: string;
  sendBackground: string;
  sendTextColor: string;
  sendDisabledBackground: string;
  sendDisabledTextColor: string;
  focusBorderColor?: string;
  /** Full CSS box-shadow value shown while the textarea is focused. */
  focusGlow?: string;
}

// ── Orin guide panel (purple accent on dark-blue surfaces) ──────────────────

export const ORIN_GUIDE_SPEAKER: ChatSpeakerTheme = {
  orb: {
    gradient: 'radial-gradient(circle at 35% 35%, #e9d5ff, #7c3aed 60%, #2e1065)',
    borderColor: 'rgba(168,85,247,0.5)',
    glowColor: 'rgba(168,85,247,0.55)',
  },
  bubble: {
    background: '#0d0d1f',
    borderColor: '#16162a',
    accentColor: '#a855f7',
    textColor: '#8896a8',
  },
};

export const ORIN_GUIDE_STUDENT: StudentBubbleTheme = {
  background: 'rgba(168,85,247,0.10)',
  borderColor: 'rgba(168,85,247,0.25)',
  textColor: '#a855f7',
};

export const ORIN_GUIDE_INPUT: ChatInputTheme = {
  surface: '#0d0d1f',
  borderColor: '#16162a',
  textColor: '#e2e8f0',
  caretColor: '#a855f7',
  sendBackground: '#a855f7',
  sendTextColor: '#000',
  sendDisabledBackground: '#1f1f38',
  sendDisabledTextColor: '#5c6f85',
};

// ── Planet figure panel (violet figure + green Orin on pure-black surfaces) ─

export const PLANET_FIGURE_SPEAKER: ChatSpeakerTheme = {
  orb: {
    gradient: 'radial-gradient(circle at 35% 35%, #d0c0ff, #7755bb 60%, #2a1a44)',
    borderColor: 'rgba(160,144,212,0.5)',
    pulseAnimation: 'figOrbPulse 3s ease-in-out infinite',
  },
  bubble: {
    background: 'rgba(119,85,187,0.10)',
    borderColor: 'rgba(160,144,212,0.18)',
    accentColor: '#a090d4',
    textColor: '#8896a8',
  },
};

export const PLANET_ORIN_SPEAKER: ChatSpeakerTheme = {
  orb: {
    gradient: 'radial-gradient(circle at 35% 35%, #80ffcc, #00aa77 60%, #003322)',
    borderColor: 'rgba(6,214,160,0.5)',
    pulseAnimation: 'orinOrbPulse 2s ease-in-out infinite',
  },
  bubble: {
    background: 'rgba(0,255,209,0.04)',
    borderColor: 'rgba(6,214,160,0.2)',
    accentColor: '#06D6A0',
    textColor: '#8896a8',
    leftEdgeColor: '#06D6A0',
    glow: '0 0 16px rgba(0,255,209,0.04)',
  },
};

export const PLANET_STUDENT: StudentBubbleTheme = {
  background: 'rgba(160,144,212,0.10)',
  borderColor: 'rgba(160,144,212,0.25)',
  textColor: '#a090d4',
};

export const PLANET_INPUT: ChatInputTheme = {
  surface: '#000000',
  borderColor: '#111111',
  textColor: '#e2e8f0',
  caretColor: '#00d4d4',
  sendBackground: '#a090d4',
  sendTextColor: '#fff',
  sendDisabledBackground: '#161616',
  sendDisabledTextColor: '#5c6f85',
  focusBorderColor: 'rgba(155,92,255,0.5)',
  focusGlow: '0 0 16px rgba(155,92,255,0.12)',
};
