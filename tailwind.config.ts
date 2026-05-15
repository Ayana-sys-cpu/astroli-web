import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'magenta':    '#FF0080',
        'teal':       '#00F5D4',
        'teal-legacy':'#00C4CC',
        'purple':     '#8B00FF',
        'gold':       '#FFD600',
        'neon-green': '#00FF88',
        'panel':      '#07070F',
        'panel-mid':  '#0C0C18',
      },
      fontFamily: {
        space:  ['var(--font-space)',  'sans-serif'],
        inter:  ['var(--font-inter)',  'sans-serif'],
        caveat: ['var(--font-caveat)', 'cursive'],
      },
      boxShadow: {
        'orb':        '0 0 24px rgba(0,245,212,0.6), 0 0 60px rgba(0,245,212,0.22), inset 0 0 20px rgba(0,245,212,0.12)',
        'orb-sm':     '0 0 12px rgba(0,245,212,0.5), 0 0 28px rgba(0,245,212,0.2)',
        'magenta':    '0 0 24px rgba(255,0,128,0.5), 0 0 60px rgba(255,0,128,0.2)',
        'magenta-sm': '0 0 12px rgba(255,0,128,0.6)',
        'planet':     '0 0 18px rgba(0,245,212,0.45)',
        'planet-h':   '0 0 28px rgba(0,245,212,0.7)',
        'gold':       '0 0 14px rgba(255,214,0,0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 14s linear infinite',
        'spin-rev':   'spin 20s linear infinite reverse',
      },
      backgroundImage: {
        'grid': 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        'magenta-teal': 'linear-gradient(135deg, #FF0080 0%, #c060ff 50%, #00F5D4 100%)',
      },
      backgroundSize: {
        'grid': '44px 44px',
      },
    },
  },
  plugins: [],
};
export default config;
