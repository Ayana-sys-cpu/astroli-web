'use client';

import { useRef, useEffect } from 'react';

// Full-screen hyperdrive star-streak canvas. Streaks radiate from the center
// and loop for as long as the component is mounted — the mount/unmount of the
// parent overlay controls the animation's lifetime, so the same component
// serves both the home-orbit launch and the landscape loading takeover.
export default function HyperdriveStreaks() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    const ctx = cv.getContext('2d')!;
    const W = cv.width, H = cv.height;
    const cx = W / 2, cy = H / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) * 1.1;

    const NUM = 90;
    const streaks = Array.from({ length: NUM }, () => ({
      angle:     Math.random() * Math.PI * 2,
      speed:     0.35 + Math.random() * 0.65,
      len:       0.05 + Math.random() * 0.09,
      bright:    0.4  + Math.random() * 0.6,
      startDist: Math.random() * 0.15,
    }));

    const t0 = performance.now();
    let raf = 0;

    function tick(now: number) {
      const elapsed = (now - t0) / 1000;
      const stretch = Math.min(1, elapsed / 0.35);

      ctx.clearRect(0, 0, W, H);

      streaks.forEach(s => {
        const head = (s.startDist + elapsed * s.speed * 0.8) % 1;
        const tail = Math.max(0, head - s.len * stretch);

        const hx = cx + Math.cos(s.angle) * head * maxR;
        const hy = cy + Math.sin(s.angle) * head * maxR;
        const tx = cx + Math.cos(s.angle) * tail * maxR;
        const ty = cy + Math.sin(s.angle) * tail * maxR;

        const alpha = stretch * s.bright;
        if (alpha < 0.02) return;

        const grad = ctx.createLinearGradient(tx, ty, hx, hy);
        grad.addColorStop(0, 'rgba(200,150,255,0)');
        grad.addColorStop(1, `rgba(220,180,255,${alpha})`);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.5 + s.bright * 1.5;
        ctx.stroke();
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
