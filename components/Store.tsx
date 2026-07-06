'use client';
import { useState, useEffect, useRef } from 'react';
import {
  CATALOGUE,
  CATALOGUE_BY_ID,
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/lib/store-catalogue';
import type { Category, StoreItem } from '@/lib/store-catalogue';
import { useCoinReward } from '@/hooks/useCoinReward';
import { getAvatarVideoUrl } from '@/lib/avatar-video';
import { MOCK_STUDENT_USER } from '@/lib/dev/mock-student-user';

const STUDENT_HEADERS = {
  'Content-Type': 'application/json',
  'x-student-id': MOCK_STUDENT_USER.studentId,
};

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

// ── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({
  item,
  balance,
  categoryWarningItem,
  onCancel,
  onConfirm,
}: {
  item:                 StoreItem;
  balance:              number;
  categoryWarningItem:  StoreItem | null;
  onCancel:             () => void;
  onConfirm:            (id: string) => Promise<void>;
}) {
  const [buying, setBuying] = useState(false);

  async function handleConfirm() {
    if (buying) return;
    setBuying(true);
    try {
      await onConfirm(item.id);
    } finally {
      setBuying(false);
    }
  }

  const balanceAfter = balance - (item.price ?? 0);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(6,6,18,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '320px', borderRadius: '18px',
          background: '#1a0a3a',
          border: '1px solid rgba(124,58,237,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Item preview */}
        <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
          <img
            src={item.image}
            alt={item.name}
            style={{ width: '88px', height: '88px', objectFit: 'contain', display: 'block', margin: '0 auto 12px' }}
          />
          <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>
            {item.name}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            <span>
              Cost: <span style={{ color: '#fde68a', fontWeight: 500 }}>★ {item.price}</span>
            </span>
            <span>
              After: <span style={{ color: balanceAfter >= 0 ? 'rgba(255,255,255,0.7)' : '#f87171', fontWeight: 500 }}>★ {balanceAfter}</span>
            </span>
          </div>
        </div>

        {/* Category warning */}
        {categoryWarningItem && (
          <div style={{
            margin: '14px 20px 0',
            padding: '10px 12px',
            background: 'rgba(212,160,23,0.1)',
            border: '1px solid rgba(212,160,23,0.3)',
            borderRadius: '10px',
            fontSize: '12px', color: '#fde68a', lineHeight: 1.5,
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: '5px', fontSize: '13px' }} />
            <strong>{categoryWarningItem.name}</strong> is currently equipped. Only one item can be equipped at a time — you can swap anytime.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: 'rgba(255,255,255,0.6)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={buying}
            style={{
              flex: 1, padding: '9px', borderRadius: '10px',
              border: 'none',
              background: buying ? 'rgba(124,58,237,0.4)' : '#7c3aed',
              color: '#fff',
              fontSize: '13px', fontWeight: 500,
              cursor: buying ? 'default' : 'pointer',
            }}
          >
            {buying ? '…' : 'Buy now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({
  item, balance, isOwned, isEquipped, onEquip, onBuyIntent,
}: {
  item:        StoreItem;
  balance:     number;
  isOwned:     boolean;
  isEquipped:  boolean;
  onEquip:     (id: string) => Promise<void>;
  onBuyIntent: (item: StoreItem) => void;
}) {
  const [equipPending, setEquipPending] = useState(false);
  const canAfford = item.price !== null && balance >= item.price;
  const isLocked  = !isOwned && !canAfford;

  const borderColor = isEquipped
    ? '#7c3aed'
    : isOwned
    ? 'rgba(20,184,166,0.5)'
    : RARITY_BORDER[item.rarity];

  const bgColor = isEquipped
    ? 'rgba(124,58,237,0.12)'
    : isOwned
    ? 'rgba(20,184,166,0.06)'
    : 'rgba(255,255,255,0.03)';

  async function handleEquip() {
    if (!isOwned || equipPending) return;
    setEquipPending(true);
    try { await onEquip(item.id); } finally { setEquipPending(false); }
  }

  function handleClick() {
    if (!item.revealed) return;
    if (isOwned) { handleEquip(); return; }
    if (canAfford) { onBuyIntent(item); }
  }

  // Unrevealed mystery item
  if (!item.revealed) {
    return (
      <div style={{
        borderRadius: '14px', padding: '28px 16px 24px', textAlign: 'center',
        border: `2px solid ${RARITY_BORDER.cosmic}`,
        background: 'rgba(255,255,255,0.02)',
        opacity: 0.7, userSelect: 'none',
      }}>
        <i className="ti ti-lock" style={{ fontSize: '48px', color: 'rgba(212,160,23,0.5)', display: 'block', marginBottom: '10px' }} />
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>???</span>
      </div>
    );
  }

  return (
    <div
      onClick={!isLocked ? handleClick : undefined}
      style={{
        position: 'relative', borderRadius: '14px', padding: '28px 16px 24px',
        textAlign: 'center',
        cursor: isLocked ? 'default' : 'pointer',
        border: `2px solid ${borderColor}`,
        background: bgColor,
        opacity: isLocked ? 0.55 : 1,
        transition: 'border-color 0.12s, opacity 0.15s',
        userSelect: 'none', overflow: 'hidden',
      }}
    >
      {/* Equipped badge */}
      {isEquipped && (
        <span style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.5)',
          borderRadius: '6px', padding: '2px 7px',
          fontSize: '10px', fontWeight: 500, color: '#c4b5fd',
        }}>
          equipped
        </span>
      )}

      {/* Owned badge */}
      {isOwned && !isEquipped && (
        <span style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'rgba(20,184,166,0.18)', border: '1px solid rgba(20,184,166,0.45)',
          borderRadius: '6px', padding: '2px 7px',
          fontSize: '10px', fontWeight: 500, color: '#2dd4bf',
        }}>
          owned
        </span>
      )}

      <img
        src={item.image}
        alt={item.name}
        style={{ width: '170px', height: '170px', objectFit: 'contain', display: 'block', margin: '0 auto 14px' }}
      />
      <span style={{
        fontSize: '14px',
        color: isOwned ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.55)',
        lineHeight: 1.3, display: 'block',
      }}>
        {item.name}
      </span>

      {/* Price pill (unowned only) */}
      {!isOwned && item.price !== null && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          marginTop: '8px',
          padding: '3px 10px', borderRadius: '20px',
          fontSize: '11px', fontWeight: 500,
          background: canAfford ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${canAfford ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: canAfford ? '#fde68a' : 'rgba(255,255,255,0.35)',
        }}>
          {!canAfford && <i className="ti ti-lock" style={{ fontSize: '10px' }} />}
          ★ {item.price}
        </span>
      )}

      {/* Owned equip hint */}
      {isOwned && !isEquipped && (
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', display: 'block' }}>
          click to equip
        </span>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Store ─────────────────────────────────────────────────────────────────────

export default function Store() {
  const [activeCategory, setActiveCategory] = useState<Category>('capes');
  const [storeState,     setStoreState]     = useState<StoreState | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [confirmingItem, setConfirmingItem] = useState<StoreItem | null>(null);
  const [previewItemId,  setPreviewItemId]  = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { balance: sharedBalance, setBalance: setSharedBalance } = useCoinReward();

  useEffect(() => {
    fetch('/api/store/state', { headers: STUDENT_HEADERS })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data: StoreState) => { setStoreState(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const displayBalance = sharedBalance ?? storeState?.balance ?? 0;

  const categoryItems = CATALOGUE.filter(item => item.category === activeCategory);

  // Single-slot: at most one item equipped across all categories
  const equippedItemId: string | null = storeState
    ? (CATEGORIES.map(c => storeState.equipped[c]).find(Boolean) ?? null)
    : null;

  const equippedItems: StoreItem[] = equippedItemId && CATALOGUE_BY_ID[equippedItemId]
    ? [CATALOGUE_BY_ID[equippedItemId]]
    : [];

  // Video shown in avatar preview: hover preview takes priority over equipped
  const avatarVideoUrl = getAvatarVideoUrl(previewItemId ?? equippedItemId);

  // Reload video whenever the src changes
  useEffect(() => {
    videoRef.current?.load();
  }, [avatarVideoUrl]);

  // Warning: show the currently equipped item (any category) when purchasing
  const categoryWarningItem: StoreItem | null = confirmingItem && equippedItemId
    ? (CATALOGUE_BY_ID[equippedItemId] ?? null)
    : null;

  async function handleEquip(itemId: string) {
    const res = await fetch('/api/store/equip', {
      method: 'POST', headers: STUDENT_HEADERS,
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      const { equipped } = await res.json();
      setStoreState(prev => prev ? { ...prev, equipped } : prev);
    }
  }

  async function handlePurchase(itemId: string) {
    const res = await fetch('/api/store/purchase', {
      method: 'POST', headers: STUDENT_HEADERS,
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      const { newBalance, equipped } = await res.json();
      setStoreState(prev => prev ? { balance: newBalance, owned: [...prev.owned, itemId], equipped } : prev);
      setSharedBalance(newBalance);
      setConfirmingItem(null);
    } else if (res.status === 409) {
      fetch('/api/store/state').then(r => r.json()).then(setStoreState).catch(() => {});
      setConfirmingItem(null);
    }
  }

  return (
    <>
      <style>{`@keyframes skPulse{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>

      {/* Purchase confirmation modal */}
      {confirmingItem && (
        <ConfirmModal
          item={confirmingItem}
          balance={displayBalance}
          categoryWarningItem={categoryWarningItem}
          onCancel={() => setConfirmingItem(null)}
          onConfirm={handlePurchase}
        />
      )}

      <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>

        {/* ── Sidebar ──────────────────────────────────────── */}
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

        {/* ── Content area ─────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
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

          {/* Avatar video preview */}
          <div style={{
            padding: '12px 24px 0', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
              border: '1.5px solid rgba(124,58,237,0.35)',
              background: '#0d0d1a',
            }}>
              <video
                ref={videoRef}
                src={avatarVideoUrl}
                autoPlay loop muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>
                Orin
              </div>
              <div style={{ fontSize: '12px', color: equippedItemId ? '#c4b5fd' : 'rgba(255,255,255,0.25)' }}>
                {previewItemId && CATALOGUE_BY_ID[previewItemId]
                  ? `Preview: ${CATALOGUE_BY_ID[previewItemId].name}`
                  : equippedItemId && CATALOGUE_BY_ID[equippedItemId]
                  ? `Equipped: ${CATALOGUE_BY_ID[equippedItemId].name}`
                  : 'No item equipped'}
              </div>
            </div>
          </div>

          {/* Item grid */}
          <div style={{ flex: 1, padding: '16px 24px 24px', overflowY: 'auto' }}>
            {loading ? <Skeleton /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {categoryItems.map(item => (
                  <div
                    key={item.id}
                    onMouseEnter={() => (storeState?.owned.includes(item.id)) ? setPreviewItemId(item.id) : undefined}
                    onMouseLeave={() => setPreviewItemId(null)}
                  >
                    <ItemCard
                      item={item}
                      balance={displayBalance}
                      isOwned={storeState?.owned.includes(item.id) ?? false}
                      isEquipped={equippedItemId === item.id}
                      onEquip={handleEquip}
                      onBuyIntent={setConfirmingItem}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
