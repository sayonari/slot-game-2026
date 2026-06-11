// HUD（下部操作パネル・トップバー）の表示制御

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

export interface HudCallbacks {
  onSpin: () => void;
  onBetUp: () => void;
  onBetDown: () => void;
  onAuto: () => void;
  onMenu: (which: 'paytable' | 'ach' | 'collection' | 'settings') => void;
  onLogoTap: () => void;
}

const MESSAGES = [
  'WILDは何にでも化ける万能シンボル！',
  '🎰 BONUSが3つ揃えばフリースピン突入！',
  '赤いオーラは激アツの予感…',
  '虹オーラが出たら超激アツ!!',
  'JACKPOTはベットするほど積み上がる！',
  '回転中にもう一度押すとクイックストップ！',
  'デイリーボーナスは毎日もらえる！',
  '隠しコマンド…？ ↑↑↓↓←→←→…',
  'レベルが上がると新しいテーマが解放！',
  '実績を集めて図鑑をコンプリートしよう！',
  '7時台に遊ぶと何かが起こる…かも？',
  'タイトルロゴ、なんだか触りたくなるよね…',
  '突然の「BONUS CHANCE」でMINI/MINOR/MAJORの大量メダル！',
  '🐠 魚群が泳いだら大チャンス！…たまにガセ',
  '疑似連は続くほどアツい！ 2連来たら期待大！',
  'ボーナス後はLUCKY TIME！10回転 消費なしの超高確率！',
];

export class Hud {
  private coinsTarget = 0;
  private coinsShown = 0;
  private jackpotTarget = 0;
  private jackpotShown = 0;
  private msgIndex = 0;
  private msgTimer = 0;

  constructor(cb: HudCallbacks) {
    $('btn-spin').addEventListener('click', cb.onSpin);
    $('btn-bet-up').addEventListener('click', cb.onBetUp);
    $('btn-bet-down').addEventListener('click', cb.onBetDown);
    $('btn-auto').addEventListener('click', cb.onAuto);
    $('btn-paytable').addEventListener('click', () => cb.onMenu('paytable'));
    $('btn-ach').addEventListener('click', () => cb.onMenu('ach'));
    $('btn-collection').addEventListener('click', () => cb.onMenu('collection'));
    $('btn-settings').addEventListener('click', () => cb.onMenu('settings'));
    $('logo').addEventListener('click', cb.onLogoTap);
  }

  setCoins(n: number, instant = false) {
    this.coinsTarget = n;
    if (instant) {
      this.coinsShown = n;
      $('coins-value').textContent = fmt(n);
    }
  }

  setWin(n: number) {
    const el = $('win-value');
    el.textContent = fmt(n);
    el.classList.toggle('haswin', n > 0);
  }

  setBet(n: number) {
    $('bet-value').textContent = fmt(n);
  }

  setJackpot(n: number, instant = false) {
    this.jackpotTarget = n;
    if (instant) this.jackpotShown = n;
  }

  setLevel(level: number, ratio: number) {
    $('level-num').textContent = `Lv.${level}`;
    $('level-fill').style.width = `${Math.min(ratio * 100, 100)}%`;
  }

  setSpinState(state: 'idle' | 'spinning' | 'disabled') {
    const btn = $('btn-spin') as HTMLButtonElement;
    const label = $('spin-label');
    btn.disabled = state === 'disabled';
    btn.classList.toggle('stop', state === 'spinning');
    label.textContent = state === 'spinning' ? 'STOP' : 'SPIN';
  }

  setAuto(on: boolean) {
    $('btn-auto').classList.toggle('on', on);
  }

  setFreeSpin(left: number, mult: number) {
    const el = $('fs-hud');
    if (left > 0) {
      el.classList.remove('hidden');
      $('fs-left').textContent = String(left);
      $('fs-mult').textContent = String(mult);
    } else {
      el.classList.add('hidden');
    }
  }

  setLucky(left: number) {
    const el = $('lucky-hud');
    if (left > 0) {
      el.classList.remove('hidden');
      $('lucky-left').textContent = String(left);
    } else {
      el.classList.add('hidden');
    }
  }

  message(text: string) {
    $('msgline').textContent = text;
    this.msgTimer = -8; // しばらく自動メッセージを止める
  }

  update(dt: number) {
    // コインのロール表示
    if (this.coinsShown !== this.coinsTarget) {
      const diff = this.coinsTarget - this.coinsShown;
      this.coinsShown += diff * Math.min(dt * 8, 1);
      if (Math.abs(this.coinsTarget - this.coinsShown) < 1) this.coinsShown = this.coinsTarget;
      $('coins-value').textContent = fmt(this.coinsShown);
    }
    // ジャックポットは常にゆっくり追従
    if (this.jackpotShown !== this.jackpotTarget) {
      const diff = this.jackpotTarget - this.jackpotShown;
      this.jackpotShown += diff * Math.min(dt * 2.5, 1);
      if (Math.abs(this.jackpotTarget - this.jackpotShown) < 1) this.jackpotShown = this.jackpotTarget;
      $('jackpot-value').textContent = fmt(this.jackpotShown);
    }
    // ティッカーメッセージ
    this.msgTimer += dt;
    if (this.msgTimer > 9) {
      this.msgTimer = 0;
      this.msgIndex = (this.msgIndex + 1) % MESSAGES.length;
      $('msgline').textContent = MESSAGES[this.msgIndex];
    }
  }
}
