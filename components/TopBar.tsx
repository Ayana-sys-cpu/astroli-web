import { MOCK_USER } from '@/lib/mock-data';

interface TopBarProps {
  left?: string;
  center?: string;
  showUser?: boolean;
}

export default function TopBar({ left, center, showUser = true }: TopBarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
      <span className="text-[10px] tracking-[0.22em] text-white/35 font-space uppercase">
        {left ?? 'MISSION 03 · WHO OWNS THE TRUTH?'}
      </span>

      {center && (
        <span className="absolute left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-[#00C4CC]/70 font-space uppercase">
          {center}
        </span>
      )}

      {showUser && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40 font-space">{MOCK_USER.displayName}</span>
          <div className="w-6 h-6 rounded-full border border-[#00C4CC]/50 flex items-center justify-center bg-[#001820]">
            <span className="text-[9px] text-[#00C4CC] font-space font-bold">
              {MOCK_USER.firstName[0]}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
