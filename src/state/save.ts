// localStorage セーブ・ロード／エクスポート・インポート

const KEY = 'neonrush2026_save_v1';

export interface Settings {
  volume: number;
  muted: boolean;
}

export interface SaveData {
  coins: number;
  betIndex: number;
  totalSpins: number;
  totalWinAmount: number;
  totalBetAmount: number;
  maxWin: number;
  level: number;
  xp: number;
  jackpot: number;
  achievements: string[];
  collection: string[];
  lastDailyDate: string;
  loginStreak: number;
  theme: string;
  logoTaps: number;
  consecLosses: number;
  rescueCount: number;
  freespinEntries: number;
  settings: Settings;
}

export const DEFAULT_SAVE: SaveData = {
  coins: 1000,
  betIndex: 1,
  totalSpins: 0,
  totalWinAmount: 0,
  totalBetAmount: 0,
  maxWin: 0,
  level: 1,
  xp: 0,
  jackpot: 10000,
  achievements: [],
  collection: [],
  lastDailyDate: '',
  loginStreak: 0,
  theme: 'neon',
  logoTaps: 0,
  consecLosses: 0,
  rescueCount: 0,
  freespinEntries: 0,
  settings: { volume: 0.8, muted: false },
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const data = JSON.parse(raw) as Partial<SaveData>;
    return { ...structuredClone(DEFAULT_SAVE), ...data, settings: { ...DEFAULT_SAVE.settings, ...(data.settings ?? {}) } };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function saveSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 容量超過などは無視 */
  }
}

export function resetSave(): SaveData {
  const d = structuredClone(DEFAULT_SAVE);
  saveSave(d);
  return d;
}

export function exportSave(data: SaveData): string {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

export function importSave(text: string): SaveData | null {
  try {
    const data = JSON.parse(decodeURIComponent(atob(text.trim()))) as Partial<SaveData>;
    if (typeof data.coins !== 'number') return null;
    const merged = { ...structuredClone(DEFAULT_SAVE), ...data, settings: { ...DEFAULT_SAVE.settings, ...(data.settings ?? {}) } };
    saveSave(merged);
    return merged;
  } catch {
    return null;
  }
}
