import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Astroli — Bring Back the Joy of Learning',
  description: 'A cosmic learning platform that trades tests and transmission for exploration and dialogue. Start a free trial for your classroom.',
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
