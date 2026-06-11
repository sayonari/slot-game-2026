// ゲーム全体の定数・シンボル・ペイライン定義

export const REELS = 5;
export const ROWS = 3;
export const LINES = 20;
export const STRIP_LEN = 64;

export const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000];

export type SymbolKind = 'wild' | 'seven' | 'bar' | 'scatter' | 'emoji';

export interface SymbolDef {
  id: number;
  key: string;
  name: string;
  kind: SymbolKind;
  emoji: string;
  color: string;
  pays: [number, number, number]; // 3個 / 4個 / 5個 揃い（ラインベット倍率）
  weight: number;
}

export const SYMBOLS: SymbolDef[] = [
  { id: 0, key: 'wild',    name: 'WILD',      kind: 'wild',    emoji: '🌈', color: '#ff5cf0', pays: [50, 250, 1000], weight: 2 },
  { id: 1, key: 'seven',   name: 'セブン',     kind: 'seven',   emoji: '7',  color: '#ff3355', pays: [30, 120, 500],  weight: 3 },
  { id: 2, key: 'bar',     name: 'BAR',       kind: 'bar',     emoji: 'B',  color: '#ffd24a', pays: [20, 60, 200],   weight: 4 },
  { id: 3, key: 'diamond', name: 'ダイヤ',     kind: 'emoji',   emoji: '💎', color: '#19e3ff', pays: [15, 40, 120],   weight: 5 },
  { id: 4, key: 'bell',    name: 'ベル',       kind: 'emoji',   emoji: '🔔', color: '#ffcc33', pays: [10, 25, 80],    weight: 6 },
  { id: 5, key: 'star',    name: 'スター',     kind: 'emoji',   emoji: '⭐', color: '#ffee55', pays: [8, 20, 60],     weight: 6 },
  { id: 6, key: 'clover',  name: 'クローバー', kind: 'emoji',   emoji: '🍀', color: '#4ade80', pays: [5, 15, 40],     weight: 7 },
  { id: 7, key: 'cherry',  name: 'チェリー',   kind: 'emoji',   emoji: '🍒', color: '#ff6688', pays: [4, 10, 30],     weight: 8 },
  { id: 8, key: 'lemon',   name: 'レモン',     kind: 'emoji',   emoji: '🍋', color: '#ffe066', pays: [3, 8, 20],      weight: 8 },
  { id: 9, key: 'scatter', name: 'BONUS',     kind: 'scatter', emoji: '🎰', color: '#b388ff', pays: [0, 0, 0],       weight: 2 },
];

export const WILD_ID = 0;
export const SCATTER_ID = 9;

// スキャッター数 → フリースピン回数 / 配当（総ベット倍率）
export const SCATTER_FREESPINS: Record<number, number> = { 3: 10, 4: 15, 5: 20 };
export const SCATTER_PAYS: Record<number, number> = { 3: 2, 4: 10, 5: 50 };

// 20ペイライン（各リールの行番号 0=上段, 1=中段, 2=下段）
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 2, 2, 2, 0],
];

export const LINE_COLORS = [
  '#ff2d95', '#19e3ff', '#ffd24a', '#4ade80', '#ff8c42',
  '#b388ff', '#ff5560', '#7ef0ff', '#ffe066', '#5cffb8',
];

// 決定論的な乱数（リール配列生成用）
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 各リールのシンボル帯を生成（重み付き＋シャッフル、シードで固定）
export function buildStrips(): number[][] {
  const strips: number[][] = [];
  for (let r = 0; r < REELS; r++) {
    const pool: number[] = [];
    for (const s of SYMBOLS) for (let i = 0; i < s.weight; i++) pool.push(s.id);
    const rnd = mulberry32(20260611 + r * 7777);
    while (pool.length < STRIP_LEN) pool.push(6 + Math.floor(rnd() * 3));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    strips.push(pool);
  }
  return strips;
}
