'use client';
import { useRouter } from 'next/navigation';
import { useCoinReward } from '@/hooks/useCoinReward';

export default function StoreButton() {
  const router = useRouter();
  const { balance } = useCoinReward();

  return (
    <button
      onClick={() => router.push('/store')}
      className="flex items-center justify-center gap-1.5 rounded-full border-none whitespace-nowrap transition-colors"
      style={{ padding: '5px 12px', background: '#7c3aed' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#6b2fd6'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
      aria-label="Open store"
      title="Store"
    >
      <i className="ti ti-building-store" style={{ fontSize: '12px', color: '#fff' }} />
      <span style={{ fontSize: '10px', fontWeight: 500, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Store
      </span>
      {balance !== null && (
        <span style={{ fontSize: '10px', fontWeight: 500, color: '#fde68a' }}>
          · {balance}
        </span>
      )}
    </button>
  );
}
