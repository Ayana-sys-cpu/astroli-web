'use client';
import { useState } from 'react';

const CATS = [
  { key: 'helmets', label: 'Helmets' },
  { key: 'suits',   label: 'Suits'   },
  { key: 'gadgets', label: 'Gadgets' },
] as const;

type CatKey = typeof CATS[number]['key'];

interface Item {
  id: string;
  name: string;
  icon: string;
  price?: number;
}

const ITEMS: Record<CatKey, Item[]> = {
  helmets: [
    { id: 'v1', name: 'Astro Visor',  icon: 'ti-circle'   },
    { id: 'v2', name: 'Nebula Helm',  icon: 'ti-hexagon'  },
    { id: 'v3', name: 'Galaxy Crown', icon: 'ti-crown',    price: 150 },
    { id: 'v4', name: 'Comet Hood',   icon: 'ti-moon',     price: 220 },
  ],
  suits: [
    { id: 's1', name: 'Pilot Suit',  icon: 'ti-user'    },
    { id: 's2', name: 'Star Cape',   icon: 'ti-wind'    },
    { id: 's3', name: 'Nova Suit',   icon: 'ti-shield',  price: 180 },
    { id: 's4', name: 'Void Cloak',  icon: 'ti-cloud',   price: 280 },
  ],
  gadgets: [
    { id: 'g1', name: 'Laser Probe', icon: 'ti-rocket'    },
    { id: 'g2', name: 'Orbit Scan',  icon: 'ti-planet',   price: 100 },
    { id: 'g3', name: 'Plasma Lens', icon: 'ti-eye',      price: 160 },
    { id: 'g4', name: 'Quantum Orb', icon: 'ti-sparkles', price: 240 },
  ],
};

interface StoreState {
  bal: number;
  owned: string[];
  sel: Record<CatKey, string>;
}

function ItemCard({
  item, cat, state, onEquip, onUnlock,
}: {
  item: Item;
  cat: CatKey;
  state: StoreState;
  onEquip: (cat: CatKey, id: string) => void;
  onUnlock: (cat: CatKey, id: string, price: number) => void;
}) {
  const owned   = state.owned.includes(item.id);
  const active  = state.sel[cat] === item.id;
  const canAfford = !owned && !!item.price && state.bal >= item.price;

  return (
    <div
      onClick={() => owned && onEquip(cat, item.id)}
      style={{
        position:   'relative',
        flex:       '0 0 88px',
        width:      '88px',
        borderRadius: '10px',
        padding:    '12px 8px 10px',
        textAlign:  'center',
        cursor:     owned ? 'pointer' : 'default',
        border:     `1.5px solid ${active ? '#7c3aed' : 'rgba(255,255,255,0.07)'}`,
        background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
        opacity:    owned ? 1 : 0.32,
        transition: 'border-color 0.12s, opacity 0.15s',
        userSelect: 'none',
      }}
      className="store-item"
    >
      <i
        className={`ti ${item.icon}`}
        style={{
          fontSize: '26px',
          color: active ? '#c4b5fd' : '#a78bfa',
          display: 'block',
          marginBottom: '5px',
        }}
      />
      <span style={{ fontSize: '10px', color: owned ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.5)', lineHeight: 1.3, display: 'block' }}>
        {item.name}
      </span>
      {active && owned && (
        <span style={{ fontSize: '9px', color: '#2dd4bf', fontWeight: 500, marginTop: '3px', display: 'block' }}>
          ✓ on
        </span>
      )}

      {/* Price overlay for locked items */}
      {!owned && (
        <div className="price-overlay" style={{
          position: 'absolute', inset: 0, borderRadius: '9px',
          background: 'rgba(6,6,18,0.94)',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
        }}>
          <span style={{ fontSize: '11px', color: '#fde68a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
            <i className="ti ti-star-filled" style={{ fontSize: '10px', color: '#D4A017' }} />
            {item.price}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canAfford && item.price) onUnlock(cat, item.id, item.price);
            }}
            style={{
              border: 'none', borderRadius: '7px', padding: '4px 10px',
              fontSize: '10px', fontWeight: 500, cursor: canAfford ? 'pointer' : 'default',
              background: canAfford ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              color: canAfford ? '#fff' : 'rgba(255,255,255,0.3)',
            }}
          >
            {canAfford ? 'Unlock' : 'Need more ★'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Store() {
  const [state, setState] = useState<StoreState>({
    bal:   100,
    owned: ['v1', 'v2', 's1', 's2', 'g1'],
    sel:   { helmets: 'v1', suits: 's1', gadgets: 'g1' },
  });

  function equip(cat: CatKey, id: string) {
    setState(prev => ({ ...prev, sel: { ...prev.sel, [cat]: id } }));
  }

  function unlock(cat: CatKey, id: string, price: number) {
    setState(prev => ({
      bal:   prev.bal - price,
      owned: [...prev.owned, id],
      sel:   { ...prev.sel, [cat]: id },
    }));
  }

  const equippedItems = CATS.map(c => ITEMS[c.key].find(i => i.id === state.sel[c.key])).filter(Boolean) as Item[];

  return (
    <>
      <style>{`
        .store-item:hover .price-overlay { display: flex !important; }
        .store-item:not([style*="opacity: 0.32"]):hover { border-color: rgba(124,58,237,0.45); }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '560px',
        background: '#0d0d1a',
        borderRadius: '16px',
        border: '1.5px solid rgba(124,58,237,0.22)',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px 11px',
          background: 'linear-gradient(90deg, #1a0a3a 0%, #0d0d1a 100%)',
          borderBottom: '1px solid rgba(124,58,237,0.22)',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Store
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(212,160,23,0.14)', border: '1px solid rgba(212,160,23,0.36)',
            borderRadius: '20px', padding: '3px 12px',
          }}>
            <i className="ti ti-star-filled" style={{ fontSize: '12px', color: '#D4A017' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#fde68a' }}>{state.bal}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 18px' }}>
          {/* Avatar preview */}
          <div style={{
            background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)',
            borderRadius: '12px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(124,58,237,0.18)', border: '2px solid #7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className="ti ti-user" style={{ fontSize: '26px', color: '#a78bfa' }} />
            </div>
            <div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                Now equipped
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {equippedItems.map(item => (
                  <span key={item.id} style={{
                    background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                    borderRadius: '20px', padding: '2px 8px', fontSize: '10px', color: '#c4b5fd',
                    display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                  }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: '9px' }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Category rows */}
          {CATS.map(cat => {
            const selItem = ITEMS[cat.key].find(i => i.id === state.sel[cat.key]);
            return (
              <div key={cat.key} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: '10px', color: '#a78bfa' }}>{selItem?.name ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                  {ITEMS[cat.key].map(item => (
                    <ItemCard key={item.id} item={item} cat={cat.key} state={state} onEquip={equip} onUnlock={unlock} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
