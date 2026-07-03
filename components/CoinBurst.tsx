'use client';
import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 16;
const PARTICLE_COLORS = ['#c0a7ff', '#00f2ea', '#8a5cf5'];

export default function CoinBurst({
  from,
  to,
  onArrive,
  onComplete,
}: {
  from: DOMRect;
  to: DOMRect;
  onArrive: () => void;
  onComplete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firedArriveRef = useRef(false);
  const landedCountRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sx = from.left + from.width / 2;
    const sy = from.top + from.height / 2;
    const ex = to.left + to.width / 2;
    const ey = to.top + to.height / 2;

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const timer = setTimeout(() => {
        const particle = document.createElement('div');
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        Object.assign(particle.style, {
          position: 'fixed',
          zIndex: '300',
          pointerEvents: 'none',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px ${color}`,
          left: `${sx}px`,
          top: `${sy}px`,
        });
        container.appendChild(particle);

        const duration = 650 + Math.random() * 250;
        const startTime = performance.now();
        // Control point arcs upward from the launch point so the burst travels
        // in a curve toward the pill rather than a straight line.
        const cpx = sx + (Math.random() - 0.5) * 260;
        const cpy = Math.min(sy, ey) - 160 - Math.random() * 120;

        function animate(now: number) {
          const t = Math.min((now - startTime) / duration, 1);
          const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpx + t * t * ex;
          const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpy + t * t * ey;
          particle.style.left = `${x}px`;
          particle.style.top = `${y}px`;
          particle.style.opacity = String(1 - t * 0.4);

          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            particle.remove();
            if (!firedArriveRef.current) {
              firedArriveRef.current = true;
              onArrive();
            }
            landedCountRef.current += 1;
            if (landedCountRef.current === PARTICLE_COUNT) onComplete();
          }
        }
        requestAnimationFrame(animate);
      }, i * 35);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
    // Runs once per burst — `from`/`to`/callbacks are captured at mount and this
    // component is always remounted fresh (keyed by a new burst object) per claim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} />;
}
