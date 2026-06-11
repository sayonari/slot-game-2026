// NEON RUSH 2026 — エントリポイント

import { SYMBOLS } from './core/config';
import { SlotEngine } from './core/engine';
import { makeSymbolTextures } from './render/symbolTexture';
import { SlotScene } from './render/scene';
import { FxOverlay } from './render/fx';
import { AudioEngine, Sfx } from './audio/audio';
import { Bgm } from './audio/bgm';
import { loadSave, saveSave } from './state/save';
import { Hud } from './ui/hud';
import { Overlays } from './ui/overlays';
import { Modals } from './ui/modals';
import { Director } from './game/director';

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

// ---------- 初期化 ----------
const save = loadSave();
document.body.dataset.theme = save.theme;

const engine = new SlotEngine();
const textures = makeSymbolTextures(SYMBOLS);
const scene = new SlotScene($('gl') as HTMLCanvasElement, textures, engine.strips);
const fx = new FxOverlay($('fx') as HTMLCanvasElement, $('stage'), $('flash'));

const audio = new AudioEngine();
audio.setVolume(save.settings.volume);
audio.setMuted(save.settings.muted);
const sfx = new Sfx(audio);
const bgm = new Bgm(audio);

const overlays = new Overlays();

const modals = new Modals({
  onVolume: (v) => {
    save.settings.volume = v;
    audio.setVolume(v);
    saveSave(save);
  },
  onMute: (m) => {
    audio.setMuted(m);
    saveSave(save);
  },
  onTheme: (theme) => {
    document.body.dataset.theme = theme;
    sfx.click();
    saveSave(save);
  },
  onImport: (data) => {
    Object.assign(save, data);
    document.body.dataset.theme = save.theme;
    audio.setVolume(save.settings.volume);
    audio.setMuted(save.settings.muted);
    director.refreshHud(true);
    overlays.toast('📥 セーブデータを読み込みました');
  },
  onReset: (data) => {
    Object.assign(save, data);
    document.body.dataset.theme = save.theme;
    director.refreshHud(true);
    overlays.toast('🔄 データを初期化しました');
  },
});

const hud = new Hud({
  onSpin: () => director.onSpinButton(),
  onBetUp: () => director.changeBet(1),
  onBetDown: () => director.changeBet(-1),
  onAuto: () => director.toggleAuto(),
  onMenu: (which) => {
    sfx.click();
    if (which === 'paytable') modals.showPaytable();
    else if (which === 'ach') modals.showAchievements(save);
    else if (which === 'collection') modals.showCollection(save);
    else modals.showSettings(save);
  },
  onLogoTap: () => director.logoTapped(),
});

const director = new Director({ engine, scene, fx, sfx, bgm, hud, overlays, modals, save });
director.refreshHud(true);

// ---------- リール窓フレームの位置合わせ ----------
function positionCabinet() {
  const rect = scene.windowScreenRect();
  const cab = $('cabinet');
  cab.style.left = `${rect.x}px`;
  cab.style.top = `${rect.y}px`;
  cab.style.width = `${rect.w}px`;
  cab.style.height = `${rect.h}px`;
}

window.addEventListener('resize', () => {
  scene.resize();
  fx.resize();
  positionCabinet();
});
positionCabinet();

// ---------- オーディオ解禁（初回タップ） ----------
const unlock = () => {
  audio.ensure();
  bgm.start();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// ---------- キーボード操作・隠しコマンド ----------
const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA',
];
let konamiPos = 0;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    director.onSpinButton();
  }
  // コナミコマンド判定
  if (e.code === KONAMI[konamiPos]) {
    konamiPos++;
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      director.activateFever();
    }
  } else {
    konamiPos = e.code === KONAMI[0] ? 1 : 0;
  }
});

// ---------- デイリーボーナス ----------
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function checkDaily() {
  const today = localDateStr(new Date());
  if (save.lastDailyDate === today) return;
  const yesterday = localDateStr(new Date(Date.now() - 86400000));
  save.loginStreak = save.lastDailyDate === yesterday ? save.loginStreak + 1 : 1;
  save.lastDailyDate = today;
  const amount = 500 + 100 * Math.min(save.loginStreak - 1, 10);
  saveSave(save);
  setTimeout(() => {
    modals.showDaily(amount, save.loginStreak, () => director.claimDaily(amount, save.loginStreak));
  }, 800);
}
checkDaily();

// 初回起動時はコイン切れチェックも
setTimeout(() => director.maybeOfferRescue(), 1600);

// ---------- メインループ ----------
let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  scene.update(dt);
  scene.render();
  fx.update(dt);
  fx.render();
  hud.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
