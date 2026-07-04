'use client';
import { useRef, useState, type ReactNode, type CSSProperties } from 'react';

interface TiltPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  strength?: number;
}

// Subtle mouse-parallax tilt — the glass panel leans toward the cursor like
// it's floating in orbit, not a full 3D tilt-card gimmick.
export default function TiltPanel({ children, className = '', style, strength = 8 }: TiltPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg) translateZ(0)');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`rotateX(${(-py * strength).toFixed(2)}deg) rotateY(${(px * strength).toFixed(2)}deg) translateZ(0)`);
  };

  const handleMouseLeave = () => {
    setTransform('rotateX(0deg) rotateY(0deg) translateZ(0)');
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ ...style, transform, transition: 'transform 0.4s ease-out', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}
