'use client';
import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/vote-utils';

interface CountdownProps {
  endIso: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Countdown({ endIso, className, style }: CountdownProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className={className} style={style}>{formatCountdown(endIso)}</span>;
}
