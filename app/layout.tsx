import type { Metadata } from 'next';
import { Space_Grotesk, Inter, Caveat } from 'next/font/google';
import CoinRewardProvider from '@/components/CoinRewardProvider';
import IconFontActivator from '@/components/IconFontActivator';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['300', '400', '500', '600', '700'],
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500'],
});
const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Astroli — Enter the Mission',
  description: 'Your learning constellation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${caveat.variable}`}>
      <head>
        {/* Icon webfont — pinned (no @latest) and loaded non-render-blocking.
            media="print" lets the page paint immediately without waiting on the
            CDN; <IconFontActivator> flips it to media="all" after hydration so
            the icons apply. The swap runs post-hydration (not via an inline
            script or string onLoad handler) to keep server/client DOM identical
            and avoid a hydration mismatch. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          id="tabler-icons-css"
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css"
          media="print"
        />
      </head>
      <body className="bg-black text-white font-inter antialiased">
        <IconFontActivator />
        <CoinRewardProvider>
          {children}
        </CoinRewardProvider>
      </body>
    </html>
  );
}
