export type Rarity   = 'nova' | 'stellar' | 'cosmic';
export type Category = 'capes' | 'helms' | 'trinkets' | 'rides';

export interface StoreItem {
  id:       string;
  name:     string;
  category: Category;
  icon:     string;
  image:    string;
  price:    number | null;
  rarity:   Rarity;
  revealed: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  capes:    'Capes',
  helms:    'Helms',
  trinkets: 'Trinkets',
  rides:    'Rides',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  capes:    'ti-wind',
  helms:    'ti-crown',
  trinkets: 'ti-sparkles',
  rides:    'ti-rocket',
};

export const CATALOGUE: StoreItem[] = [
  // ── Capes ─────────────────────────────────────────────────────────────────
  { id: 'cp1', name: 'Lunar Cape',     category: 'capes', icon: 'ti-moon',     image: '/items/cp1.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 'cp2', name: 'Solar Cape',     category: 'capes', icon: 'ti-sun',      image: '/items/cp2.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 'cp3', name: 'Midnight Cloak', category: 'capes', icon: 'ti-eye-off',  image: '/items/cp3.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 'cp4', name: 'Phantom Cloak',  category: 'capes', icon: 'ti-ghost',    image: '/items/cp4.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 'cp5', name: 'Void Mantle',    category: 'capes', icon: 'ti-universe', image: '/items/cp5.png', price: 650,  rarity: 'cosmic',  revealed: true },

  // ── Helms ─────────────────────────────────────────────────────────────────
  { id: 'h1', name: 'Astro Visor',    category: 'helms', icon: 'ti-eye',      image: '/items/h1.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 'h2', name: 'Nebula Helm',    category: 'helms', icon: 'ti-hexagon',  image: '/items/h2.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 'h3', name: 'Star Tiara',     category: 'helms', icon: 'ti-star',     image: '/items/h3.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 'h4', name: 'Obsidian Crown', category: 'helms', icon: 'ti-crown',    image: '/items/h4.png', price: 650,  rarity: 'cosmic',  revealed: true },
  { id: 'h5', name: 'Celestial Halo', category: 'helms', icon: 'ti-circle',   image: '/items/h5.png', price: 650,  rarity: 'cosmic',  revealed: true },

  // ── Trinkets ──────────────────────────────────────────────────────────────
  { id: 't1', name: 'Orbit Sphere',  category: 'trinkets', icon: 'ti-circle-dot', image: '/items/t1.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 't2', name: 'Zodiac Charm',  category: 'trinkets', icon: 'ti-circles',    image: '/items/t2.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 't3', name: 'Void Crystal',  category: 'trinkets', icon: 'ti-diamond',    image: '/items/t3.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 't4', name: 'Solar Orrery',  category: 'trinkets', icon: 'ti-planet',     image: '/items/t4.png', price: 650,  rarity: 'cosmic',  revealed: true },
  { id: 't5', name: 'Luna Orb',      category: 'trinkets', icon: 'ti-moon-stars', image: '/items/t5.png', price: 650,  rarity: 'cosmic',  revealed: true },

  // ── Rides ─────────────────────────────────────────────────────────────────
  { id: 'r1', name: 'Galaxy Disc',  category: 'rides', icon: 'ti-disc',   image: '/items/r1.png', price: 130,  rarity: 'nova',    revealed: true },
  { id: 'r2', name: 'Star Blades',  category: 'rides', icon: 'ti-bolt',   image: '/items/r2.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 'r3', name: 'Nebula Board', category: 'rides', icon: 'ti-wave',   image: '/items/r3.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 'r4', name: 'Nimbus',       category: 'rides', icon: 'ti-cloud',  image: '/items/r4.png', price: 200,  rarity: 'stellar', revealed: true },
  { id: 'r5', name: 'Blaze Comet',  category: 'rides', icon: 'ti-rocket', image: '/items/r5.png', price: 650,  rarity: 'cosmic',  revealed: true },
];

export const CATALOGUE_BY_ID: Record<string, StoreItem> =
  Object.fromEntries(CATALOGUE.map(item => [item.id, item]));

export const STARTER_ITEM_IDS: string[] = [];

export const CATEGORIES: Category[] = ['capes', 'helms', 'trinkets', 'rides'];
