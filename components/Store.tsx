'use client';
import { useState, useEffect } from 'react';
import {
  CATALOGUE,
  CATALOGUE_BY_ID,
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/lib/store-catalogue';
import type { Category, StoreItem } from '@/lib/store-catalogue';
import { useCoinReward } from '@/hooks/useCoinReward';

interface StoreState {
  balance: number;
  owned:   string[];
  equipped: Record<Category, string | null>;
}

const RARITY_BORDER: Record<StoreItem['rarity'], string> = {
  nova:    'rgba(255,255,255,0.1)',
  stellar: 'rgba(59,130,246,0.6)',
  cosmic:  'rgba(212,160,23,0.8)',
};

function ItemCard({
  item, balance, isOwned, isEquipped, onEquip, onPurchase,
}: {
  item:       StoreItem;
  balance:    number;
  isOwned:    boolean;
  isEquipped: boolean;
  onEquip:    (id: string) => Promise<void>;
  onPurchase: (id: string) => Promise<void>;
}) {
  const [hovered,      setHovered]      = useState(false);
  const [buying,       setBuying]       = useState(false);
  const [equipPending, setEquipPending] = useState(false);

  const canAfford = item.price !== null && balance >= item.price;
  const borderColor = isEquipped ? '#7c3aed' : RARITY_BORDER[item.rarity];

  async function handleEquip() {
    if (!isOwned || equipPending) return;
    setEquipPending(true);
    try { await onEquip(item.id); } finally { setEquipPending(false); }
  }

  async function handlePurchase(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canAfford || buying || !item.revealed) return;
    setBuying(true);
    try { await onPurchase(item.id); } finally { setBuying(false); }
  }

  // Unrevealed limited mystery item
  if (!item.revealed) {
    return (
      <div style={{
        borderRadius: '14px', padding: '28px 16px 24px', textAlign: 'center',
        border: `2px solid ${RARITY_BORDER.cosmic}`,
        background: 'rgba(255,255,255,0.02)',
        opacity: 0.8, userSelect: 'none',
      }}>
        <i className="ti ti-lock" style={{ fontSize: '48px', color: 'rgba(212,160,23,0.6)', display: 'block', marginBottom: '10px' }} />
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>???</span>
      </div>
    );
  }

  return (
    <div
      onClick={isOwned ? handleEquip : undefined}
      onMouseEnter={() => { if (!isOwned) setHovered(true); }}
      onMouseLeave={() => { if (!isOwned) setHovered(false); }}
      style={{
        position: 'relative', borderRadius: '14px', padding: '28px 16px 24px',
        textAlign: 'center',
        cursor: isOwned ? 'pointer' : 'default',
        border: `2px solid ${borderColor}`,
        background: isEquipped ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
        opacity: isOwned ? 1 : 0.78,
        transition: 'border-color 0.12s, opacity 0.15s',
        userSelect: 'none', overflow: 'hidden',
      }}
    >
      <img
        src={item.image}
        alt={item.name}
        style={{ width: '170px', height: '170px', objectFit: 'contain', display: 'block', margin: '0 auto 14px' }}
      />
      <span style={{ fontSize: '14px', color: isOwned ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.55)', lineHeight: 1.3, display: 'block' }}>
        {item.name}
      </span>
      {isEquipped && (
        <span style={{ fontSize: '11px', color: '#2dd4bf', fontWeight: 500, marginTop: '6px', display: 'block' }}>
          ✓ on
        </span>
      )}

      {/* Hover purchase overlay for locked items */}
      {!isOwned && (hovered || buying) && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '12px',
          background: 'rgba(6,6,18,0.94)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '14px', color: '#fde68a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-star-filled" style={{ fontSize: '12px', color: '#D4A017' }} />
            {item.price}
          </span>
          <button
            onClick={handlePurchase}
            style={{
              border: 'none', borderRadius: '9px', padding: '6px 16px',
              fontSize: '12px', fontWeight: 500,
              cursor: canAfford && !buying ? 'pointer' : 'default',
              background: canAfford ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              color: canAfford ? '#fff' : 'rgba(255,255,255,0.3)',
            }}
          >
            {buying ? '…' : canAfford ? 'Unlock' : 'Need more ★'}
          </button>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          borderRadius: '14px', height: '258px',
          background: 'rgba(255,255,255,0.04)',
          border: '2px solid rgba(255,255,255,0.06)',
          animation: `skPulse 1.4s ease-in-out ${i * 0.08}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function Store() {
  const [activeCategory, setActiveCategory] = useState<Category>('capes');
  const [storeState,     setStoreState]     = useState<StoreState | null>(null);
  const [loading,        setLoading]        = useState(true);
  const { balance: sharedBalance, setBalance: setSharedBalance } = useCoinReward();

  useEffect(() => {
    fetch('/api/store/state')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data: StoreState) => { setStoreState(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const displayBalance = sharedBalance ?? storeState?.balance ?? 0;

  const categoryItems = CATALOGUE.filter(item => item.category === activeCategory);

  const equippedItems = storeState
    ? CATEGORIES
        .map(cat => {
          const id = storeState.equipped[cat];
          return id ? CATALOGUE_BY_ID[id] : null;
        })
        .filter(Boolean) as StoreItem[]
    : [];

  async function handleEquip(itemId: string) {
    const res = await fetch('/api/store/equip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      const { equipped } = await res.json();
      setStoreState(prev => prev ? { ...prev, equipped } : prev);
    }
  }

  async function handlePurchase(itemId: string) {
    const res = await fetch('/api/store/purchase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      const { newBalance, equipped } = await res.json();
      setStoreState(prev => prev ? { balance: newBalance, owned: [...prev.owned, itemId], equipped } : prev);
      setSharedBalance(newBalance);
    } else if (res.status === 409) {
      // Already owned — refresh.
      fetch('/api/store/state').then(r => r.json()).then(setStoreState).catch(() => {});
    }
  }

  return (
    <>
      <style>{`@keyframes skPulse{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>

      <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>

        {/* ── Sidebar ── full height ──────────────────────── */}
        <div style={{
          width: '160px', flexShrink: 0,
          borderRight: '1px solid rgba(124,58,237,0.15)',
          background: 'rgba(0,0,0,0.2)', paddingTop: '20px', paddingBottom: '20px',
        }}>
          {CATEGORIES.map(cat => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '6px', padding: '16px 0',
                  background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                  border: 'none', borderLeft: `3px solid ${isActive ? '#7c3aed' : 'transparent'}`,
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
              >
                <i
                  className={`ti ${CATEGORY_ICONS[cat]}`}
                  style={{ fontSize: '24px', color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.35)' }}
                />
                <span style={{
                  fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                }}>
                  {CATEGORY_LABELS[cat]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Content area ──────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px',
            background: 'linear-gradient(90deg, #1a0a3a 0%, #0d0d1a 100%)',
            borderBottom: '1px solid rgba(124,58,237,0.18)', flexShrink: 0,
          }}>
            <span style={{ fontSize: '16px', fontWeight: 500, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {CATEGORY_LABELS[activeCategory]}
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(212,160,23,0.14)', border: '1px solid rgba(212,160,23,0.36)',
              borderRadius: '20px', padding: '4px 12px',
            }}>
              <i className="ti ti-star-filled" style={{ fontSize: '13px', color: '#D4A017' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#fde68a' }}>
                {displayBalance}
              </span>
            </div>
          </div>

          {/* Equipped strip */}
          {equippedItems.length > 0 && (
            <div style={{
              padding: '10px 24px', borderBottom: '1px solid rgba(124,58,237,0.1)',
              display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0,
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: '2px' }}>
                Equipped:
              </span>
              {equippedItems.map(item => (
                <span key={item.id} style={{
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                  borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color: '#c4b5fd',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <img src={item.image} alt={item.name} style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                  {item.name}
                </span>
              ))}
            </div>
          )}

          {/* Item grid */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {loading ? <Skeleton /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {categoryItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    balance={displayBalance}
                    isOwned={storeState?.owned.includes(item.id) ?? false}
                    isEquipped={storeState?.equipped[item.category] === item.id}
                    onEquip={handleEquip}
                    onPurchase={handlePurchase}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
