// レベル・実績・演出図鑑・テーマ解放

import type { SaveData } from './save';

export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_spin',   icon: '🎰', name: '記念すべき第一歩', desc: '初めてスピンする' },
  { id: 'spin_100',     icon: '💯', name: 'スロット見習い',   desc: '通算100スピン' },
  { id: 'spin_1000',    icon: '🔥', name: 'スロット職人',     desc: '通算1000スピン' },
  { id: 'win_big',      icon: '💰', name: 'BIG WIN!',        desc: 'ベット10倍以上の勝利' },
  { id: 'win_mega',     icon: '💎', name: 'MEGA WIN!!',      desc: 'ベット30倍以上の勝利' },
  { id: 'win_legend',   icon: '👑', name: 'LEGEND WIN!!!',   desc: 'ベット100倍以上の勝利' },
  { id: 'jackpot',      icon: '⚡', name: '雷神降臨',         desc: 'JACKPOTを獲得する' },
  { id: 'freespin',     icon: '🎁', name: 'ボーナスタイム',   desc: 'フリースピンに突入する' },
  { id: 'fs_retrigger', icon: '🎊', name: '祭りは終わらない', desc: 'フリースピン中に再突入する' },
  { id: 'rich',         icon: '🏦', name: '大富豪',           desc: 'コイン100,000枚に到達' },
  { id: 'broke',        icon: '🚑', name: '文無しからの復活', desc: 'コイン切れ救済を受ける' },
  { id: 'maxbet_win',   icon: '🎩', name: 'ハイローラー',     desc: '最大ベットで勝利する' },
  { id: 'level_10',     icon: '🌟', name: '常連さん',         desc: 'レベル10に到達' },
  { id: 'level_20',     icon: '🌈', name: 'ネオンの覇者',     desc: 'レベル20に到達' },
  { id: 'streak_7',     icon: '📅', name: '皆勤賞',           desc: '7日連続ログイン' },
  { id: 'konami',       icon: '🕹️', name: '神のコマンド',     desc: '？？？（隠しコマンドを発見）', secret: true },
  { id: 'logo7',        icon: '🌟', name: 'ロゴの秘密',       desc: '？？？（タイトルを愛でる）', secret: true },
  { id: 'fish',         icon: '🐟', name: '雨ニモ魚ニモ',     desc: '？？？（あの伝説の演出を見る）', secret: true },
  { id: 'lucky_777',    icon: '7️⃣', name: 'ラッキーセブン',   desc: '？？？（777にまつわる何か）', secret: true },
  { id: 'seven_hour',   icon: '🕖', name: '七時の奇跡',       desc: '？？？（時間に関係がある）', secret: true },
  { id: 'perfect',      icon: '🃏', name: 'パーフェクト',     desc: '？？？（画面が全て同じに）', secret: true },
  { id: 'bonus_first',  icon: '🎖️', name: 'ボーナスデビュー', desc: 'BONUS CHANCEに当選する' },
  { id: 'bonus_major',  icon: '🏆', name: 'MAJOR制覇',        desc: 'MAJORボーナスを引き当てる' },
  { id: 'col_master',   icon: '📚', name: '図鑑コンプリート', desc: '演出図鑑を全て埋める' },
];

export interface CollectionDef {
  id: string;
  icon: string;
  name: string;
}

export const COLLECTION_ITEMS: CollectionDef[] = [
  { id: 'aura_blue',    icon: '🔵', name: '青オーラ' },
  { id: 'aura_green',   icon: '🟢', name: '緑オーラ' },
  { id: 'aura_red',     icon: '🔴', name: '赤オーラ' },
  { id: 'aura_rainbow', icon: '🌈', name: '虹オーラ' },
  { id: 'cutin_1',      icon: '💬', name: 'カットイン:チャンス' },
  { id: 'cutin_2',      icon: '⚡', name: 'カットイン:激アツ' },
  { id: 'cutin_3',      icon: '👁️', name: 'カットイン:GOD' },
  { id: 'win_big',      icon: '💰', name: 'BIG WIN' },
  { id: 'win_mega',     icon: '💎', name: 'MEGA WIN' },
  { id: 'win_legend',   icon: '👑', name: 'LEGEND WIN' },
  { id: 'jackpot',      icon: '🎆', name: 'JACKPOT' },
  { id: 'freespin',     icon: '🎁', name: 'フリースピン' },
  { id: 'lightning',    icon: '🌩️', name: '雷光演出' },
  { id: 'fish',         icon: '🐟', name: '魚の雨' },
  { id: 'trombone',     icon: '🎺', name: 'ズコー演出' },
  { id: 'fever',        icon: '🔥', name: 'フィーバーモード' },
  { id: 'rescue',       icon: '🚑', name: '救済ルーレット' },
  { id: 'daily',        icon: '📅', name: 'デイリーボーナス' },
  { id: 'gun',          icon: '🐠', name: '魚群予告' },
  { id: 'ren',          icon: '🔁', name: '疑似連' },
  { id: 'bonus_mini',   icon: '🎖️', name: 'ボーナスMINI' },
  { id: 'bonus_minor',  icon: '🏅', name: 'ボーナスMINOR' },
  { id: 'bonus_major',  icon: '🏆', name: 'ボーナスMAJOR' },
  { id: 'lucky',        icon: '⚡', name: 'ラッキータイム' },
];

export interface ThemeUnlock {
  level: number;
  theme: string;
  name: string;
}

export const THEME_UNLOCKS: ThemeUnlock[] = [
  { level: 1,  theme: 'neon',    name: 'ネオン・ミッドナイト' },
  { level: 3,  theme: 'cyber',   name: 'サイバーブルー' },
  { level: 5,  theme: 'sunset',  name: 'サンセットゴールド' },
  { level: 8,  theme: 'jungle',  name: 'ジャングルエメラルド' },
  { level: 12, theme: 'crimson', name: 'クリムゾンインフェルノ' },
  { level: 20, theme: 'rainbow', name: 'レインボーゴッド' },
];

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.6));
}

// XPを加算してレベルアップ判定。上がったレベル一覧を返す
export function addXp(save: SaveData, amount: number): number[] {
  save.xp += amount;
  const ups: number[] = [];
  while (save.xp >= xpForLevel(save.level)) {
    save.xp -= xpForLevel(save.level);
    save.level++;
    ups.push(save.level);
  }
  return ups;
}

export function grantAchievement(save: SaveData, id: string): boolean {
  if (save.achievements.includes(id)) return false;
  save.achievements.push(id);
  return true;
}

export function addCollection(save: SaveData, id: string): boolean {
  if (save.collection.includes(id)) return false;
  save.collection.push(id);
  return true;
}

export function collectionComplete(save: SaveData): boolean {
  return COLLECTION_ITEMS.every((c) => save.collection.includes(c.id));
}

export function achievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
