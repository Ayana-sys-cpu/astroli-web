import type { Metadata, Viewport } from 'next';
import CoinRewardProvider from '@/components/CoinRewardProvider';
import IconFontActivator from '@/components/IconFontActivator';
import ActivityPing from '@/components/analytics/ActivityPing';
import './globals.css';

export const metadata: Metadata = {
  title: 'Astroli — Enter the Mission',
  description: 'Your learning constellation',
};

// viewportFit 'cover' is required for env(safe-area-inset-*) to be non-zero on
// notched iPhones. Zoom is intentionally left enabled for accessibility.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts loaded in-browser (not at compile time) to avoid next/font/google
            network fetches during Next.js compilation. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500&family=Caveat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
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
        <ActivityPing />
        <CoinRewardProvider>
          {children}
        </CoinRewardProvider>
      </body>
    </html>
  );
}
