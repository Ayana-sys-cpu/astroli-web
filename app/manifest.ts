import type { MetadataRoute } from 'next';

// Passive PWA manifest: enables "Add to Home Screen" on mobile without changing
// how the site behaves for anyone who doesn't install it. No install prompt is
// shown — students use their browser's built-in option.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Astroli — Enter the Mission',
    short_name: 'Astroli',
    description: 'Your learning constellation',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
