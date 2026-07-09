'use client';
import { useEffect } from 'react';

/**
 * Activates the Tabler icon webfont without blocking first paint.
 *
 * The <link> in the root layout ships with media="print" so it never gates the
 * initial render on a CDN round-trip. This component flips it to media="all"
 * once mounted, so the icons apply. Doing the swap in useEffect (post-hydration)
 * — rather than an inline script that runs before hydration — keeps the server
 * and client initial DOM identical, avoiding a hydration mismatch.
 */
export default function IconFontActivator() {
  useEffect(() => {
    const link = document.getElementById('tabler-icons-css') as HTMLLinkElement | null;
    if (link && link.media !== 'all') link.media = 'all';
  }, []);
  return null;
}
