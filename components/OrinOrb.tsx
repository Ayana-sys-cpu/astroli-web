'use client';

interface OrinOrbProps {
  size?: number;
  pulse?: boolean;
  className?: string;
}

export default function OrinOrb({ size = 120, pulse = true, className = '' }: OrinOrbProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Outer ping ring */}
      {pulse && (
        <div
          className="absolute inset-0 rounded-full border border-[#00F5D4]/30 animate-ping"
          style={{ animationDuration: '3s' }}
        />
      )}
      {/* Orb */}
      <div
        className="absolute inset-0 rounded-full border-2 border-[#00F5D4]"
        style={{
          background: 'radial-gradient(circle at 38% 35%, #003a44, #001018 70%, #000610)',
          boxShadow:
            `0 0 ${size * 0.22}px rgba(0,245,212,0.6), 0 0 ${size * 0.5}px rgba(0,245,212,0.2), inset 0 0 ${size * 0.15}px rgba(0,245,212,0.15)`,
        }}
      />
      {/* Inner highlight */}
      <div
        className="absolute rounded-full bg-[#00F5D4]/10"
        style={{
          width: size * 0.35,
          height: size * 0.35,
          top: size * 0.12,
          left: size * 0.18,
          filter: 'blur(4px)',
        }}
      />
    </div>
  );
}
