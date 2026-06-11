// スピン進行・演出・配当・進行要素を統括するディレクター

import { BET_STEPS, LINE_COLORS, REELS, SCATTER_ID } from '../core/config';
import type { SpinOptions, SpinResult } from '../core/engine';
import { SlotEngine } from '../core/engine';
import type { SlotScene } from '../render/scene';
import type { FxOverlay } from '../render/fx';
import type { Sfx } from '../audio/audio';
import type { Bgm } from '../audio/bgm';
import type { Hud } from '../ui/hud';
import type { AuraTier, Overlays, WinTier } from '../ui/overlays';
import type { Modals } from '../ui/modals';
import type { SaveData } from '../state/save';
import { saveSave } from '../state/save';
import {
  addCollection, addXp, collectionComplete, grantAchievement,
  achievementDef, COLLECTION_ITEMS, THEME_UNLOCKS, xpForLevel,
} from '../state/progression';

interface Plan {
  aura: AuraTier;
  cutin: 0 | 1 | 2 | 3;
  anticipationFrom: number;
}

const CUTIN_TEXT: Record<1 | 2 | 3, string> = {
  1: 'チャンス!',
  2: '激アツ!!',
  3: '👁 GOD !!!',
};

export interface DirectorDeps {
  engine: SlotEngine;
  scene: SlotScene;
  fx: FxOverlay;
  sfx: Sfx;
  bgm: Bgm;
  hud: Hud;
  overlays: Overlays;
  modals: Modals;
  save: SaveData;
}

export class Director {
  spinning = false;
  auto = false;
  private quickRequested = false;
  private fsLeft = 0;
  private fsMult = 2;
  private fsTotal = 0;
  private feverSpins = 0;

  private engine: SlotEngine;
  private scene: SlotScene;
  private fx: FxOverlay;
  private sfx: Sfx;
  private bgm: Bgm;
  private hud: Hud;
  private ov: Overlays;
  private modals: Modals;
  private save: SaveData;

  constructor(d: DirectorDeps) {
    this.engine = d.engine;
    this.scene = d.scene;
    this.fx = d.fx;
    this.sfx = d.sfx;
    this.bgm = d.bgm;
    this.hud = d.hud;
    this.ov = d.overlays;
    this.modals = d.modals;
    this.save = d.save;
  }

  // セーブ差し替え（インポート・リセット時）
  replaceSave(s: SaveData) {
    this.save = s;
    this.refreshHud(true);
  }

  refreshHud(instant = false) {
    const s = this.save;
    this.hud.setCoins(s.coins, instant);
    this.hud.setBet(BET_STEPS[s.betIndex]);
    this.hud.setJackpot(s.jackpot, instant);
    this.hud.setLevel(s.level, s.xp / xpForLevel(s.level));
    this.hud.setWin(0);
  }

  private wait(ms: number, skippable = true): Promise<void> {
    return new Promise((res) => {
      const start = performance.now();
      const check = () => {
        if ((skippable && this.quickRequested) || performance.now() - start >= ms) res();
        else setTimeout(check, 16);
      };
      check();
    });
  }

  private grantAch(id: string) {
    if (grantAchievement(this.save, id)) {
      const def = achievementDef(id);
      if (def) this.ov.achievementToast(def.icon, def.name);
    }
  }

  private collect(id: string) {
    if (addCollection(this.save, id)) {
      const def = COLLECTION_ITEMS.find((c) => c.id === id);
      if (def) this.ov.collectionToast(def.icon, def.name);
      if (collectionComplete(this.save)) this.grantAch('col_master');
    }
  }

  onSpinButton() {
    if (this.modals.isOpen) return;
    if (this.spinning) {
      this.quickRequested = true;
      this.scene.hurryAll();
      return;
    }
    void this.spin();
  }

  toggleAuto() {
    this.auto = !this.auto;
    this.hud.setAuto(this.auto);
    this.sfx.click();
    if (this.auto && !this.spinning) void this.spin();
  }

  changeBet(dir: 1 | -1) {
    if (this.spinning) return;
    const next = this.save.betIndex + dir;
    if (next < 0 || next >= BET_STEPS.length) return;
    this.save.betIndex = next;
    this.hud.setBet(BET_STEPS[next]);
    this.sfx.betChange();
    saveSave(this.save);
  }

  activateFever() {
    this.feverSpins = 7;
    document.body.classList.add('fever');
    this.bgm.setMood('fever');
    this.sfx.konami();
    this.fx.confettiBurst(80);
    this.grantAch('konami');
    this.collect('fever');
    this.ov.toast('🕹️ GOD MODE 発動!! 7回スピン超強運!!');
    saveSave(this.save);
  }

  logoTapped() {
    this.save.logoTaps++;
    if (this.save.logoTaps === 7) {
      this.grantAch('logo7');
      this.fx.coinRain(60);
      this.sfx.harp();
      this.ov.toast('🌟 ロゴの祝福！コインの雨だ！');
      this.save.coins += 777;
      this.hud.setCoins(this.save.coins);
      saveSave(this.save);
    }
  }

  claimDaily(amount: number, streak: number) {
    this.save.coins += amount;
    this.collect('daily');
    if (streak >= 7) this.grantAch('streak_7');
    this.hud.setCoins(this.save.coins);
    this.sfx.harp();
    this.fx.coinBurst(window.innerWidth / 2, window.innerHeight / 2, 36);
    saveSave(this.save);
  }

  maybeOfferRescue() {
    if (this.spinning || this.modals.isOpen) return;
    if (this.save.coins >= BET_STEPS[0]) return;
    this.modals.showRescue((amount) => {
      this.save.coins += amount;
      this.save.rescueCount++;
      this.grantAch('broke');
      this.collect('rescue');
      this.sfx.rescueRoll();
      this.fx.coinBurst(window.innerWidth / 2, window.innerHeight / 2, 40);
      this.hud.setCoins(this.save.coins);
      this.ov.toast(`🚑 救済発動！ 🪙${amount} ゲット！`);
      saveSave(this.save);
    });
  }

  private plan(result: SpinResult, bet: number): Plan {
    let aura: AuraTier = 'none';
    let cutin: 0 | 1 | 2 | 3 = 0;
    const ratio = result.totalWin / bet;

    if (result.isJackpot) {
      aura = 'rainbow';
      cutin = 3;
    } else if (result.freeSpins > 0 || ratio >= 30) {
      aura = Math.random() < 0.55 ? 'rainbow' : 'red';
      if (Math.random() < 0.75) cutin = Math.random() < 0.5 ? 3 : 2;
    } else if (ratio >= 10) {
      const x = Math.random();
      aura = x < 0.55 ? 'red' : x < 0.85 ? 'green' : 'rainbow';
      if (Math.random() < 0.4) cutin = 2;
    } else if (ratio >= 3) {
      const x = Math.random();
      aura = x < 0.4 ? 'blue' : x < 0.85 ? 'green' : 'red';
      if (Math.random() < 0.15) cutin = 1;
    } else if (ratio > 0) {
      const x = Math.random();
      aura = x < 0.45 ? 'none' : x < 0.85 ? 'blue' : 'green';
    } else {
      // ハズレでもたまにガセ煽り（これがあるから熱い）
      const x = Math.random();
      aura = x < 0.86 ? 'none' : x < 0.96 ? 'blue' : x < 0.99 ? 'green' : 'red';
      if (Math.random() < 0.02) cutin = 1;
    }

    // スキャッター煽り：先行リールに2個出ていたら残りリールを煽る
    let anticipationFrom = -1;
    let cum = 0;
    for (let i = 0; i < REELS; i++) {
      if (i >= 2 && cum >= 2) {
        anticipationFrom = i;
        break;
      }
      cum += result.grid[i].filter((s) => s === SCATTER_ID).length;
    }
    return { aura, cutin, anticipationFrom };
  }

  async spin(): Promise<void> {
    if (this.spinning) return;
    const s = this.save;
    const bet = BET_STEPS[s.betIndex];
    const isFree = this.fsLeft > 0;

    if (!isFree) {
      if (s.coins < bet) {
        this.ov.toast('コインが足りない！ベットを下げよう');
        this.auto = false;
        this.hud.setAuto(false);
        this.maybeOfferRescue();
        return;
      }
      s.coins -= bet;
      s.totalBetAmount += bet;
      s.jackpot += Math.max(1, Math.round(bet * 0.04));
      this.hud.setCoins(s.coins);
      this.hud.setJackpot(s.jackpot);
    } else {
      this.fsLeft--;
      this.hud.setFreeSpin(this.fsLeft, this.fsMult);
    }

    this.spinning = true;
    this.quickRequested = false;
    this.hud.setSpinState('spinning');
    this.hud.setWin(0);
    this.scene.clearHighlights();
    this.fx.clearWinLines();
    this.ov.setAura('none');

    s.totalSpins++;
    if (s.totalSpins === 1) this.grantAch('first_spin');
    if (s.totalSpins === 100) this.grantAch('spin_100');
    if (s.totalSpins === 1000) this.grantAch('spin_1000');
    if (s.totalSpins === 777) {
      this.grantAch('lucky_777');
      s.coins += 777;
      this.ov.toast('7️⃣ 777スピン目！ご祝儀 🪙777！');
    }
    const hour = new Date().getHours();
    if (hour === 7 || hour === 19) this.grantAch('seven_hour');

    // 抽選
    const opts: SpinOptions = {};
    let usingFever = false;
    if (this.feverSpins > 0) {
      opts.rerolls = 2;
      usingFever = true;
    }
    if (s.consecLosses >= 8) opts.forceWin = true; // 天井救済：8連敗で必ず当たる
    const result = this.engine.spin(bet, opts);
    const plan = this.plan(result, bet);

    this.sfx.spinStart();
    this.scene.startSpin();

    await this.wait(280);

    // オーラ予告
    if (plan.aura !== 'none' && !this.quickRequested) {
      this.ov.setAura(plan.aura);
      this.collect(`aura_${plan.aura}`);
      if (plan.aura === 'red' || plan.aura === 'rainbow') {
        this.fx.lightning();
        this.sfx.thunder();
        this.fx.shake(10);
        this.collect('lightning');
      }
    }

    // カットイン予告
    const cutinLv = plan.cutin;
    if (cutinLv !== 0 && !this.quickRequested) {
      this.sfx.cutin(cutinLv);
      await this.ov.cutin(cutinLv, CUTIN_TEXT[cutinLv]);
      this.collect(`cutin_${cutinLv}`);
    }

    await this.wait(300);

    // リール停止シーケンス
    let scattersSoFar = 0;
    for (let i = 0; i < REELS; i++) {
      const anticipate = plan.anticipationFrom >= 0 && i >= plan.anticipationFrom;
      if (this.quickRequested) {
        await this.scene.stopReel(i, result.stops[i], { ahead: 1, dur: 0.13 });
      } else if (anticipate) {
        this.ov.setAura('red');
        for (let b = 0; b < 3 && !this.quickRequested; b++) {
          this.sfx.heartbeat();
          await this.wait(430);
        }
        await this.scene.stopReel(i, result.stops[i], { ahead: this.quickRequested ? 2 : 10, dur: this.quickRequested ? 0.2 : 1.3 });
      } else {
        await this.scene.stopReel(i, result.stops[i], { ahead: 2 + i, dur: 0.6 });
        await this.wait(120);
      }
      this.sfx.reelStop(i);
      const sc = result.grid[i].filter((sym) => sym === SCATTER_ID).length;
      scattersSoFar += sc;
      if (sc > 0 && scattersSoFar >= 2) {
        this.sfx.scatterLand();
        this.fx.shake(5);
      }
    }

    await this.settle(result, bet, isFree, usingFever);
  }

  private async settle(result: SpinResult, bet: number, isFree: boolean, usingFever: boolean): Promise<void> {
    const s = this.save;
    this.hud.setSpinState('disabled');

    // パーフェクト（全セル同一）
    const flat = result.grid.flat();
    if (flat.every((v) => v === flat[0])) this.grantAch('perfect');

    let win = result.totalWin;
    let jackpotPaid = 0;

    if (result.isJackpot) {
      jackpotPaid = s.jackpot;
      win += jackpotPaid;
      s.jackpot = 10000;
      this.hud.setJackpot(s.jackpot);
    }

    const mult = isFree ? this.fsMult : 1;
    const effWin = Math.round(win * mult);

    // 当選ライン・ハイライト表示
    if (result.lineWins.length > 0 || result.scatterCount >= 3) {
      const shown = result.lineWins.slice(0, 8);
      shown.forEach((lw, i) => {
        const color = LINE_COLORS[lw.line % LINE_COLORS.length];
        this.scene.showHighlights(lw.cells, color);
        this.fx.addWinLine(lw.cells.map(([r, row]) => this.scene.cellScreenPos(r, row)), color);
        if (i < 3) this.sfx.lineWin(lw.count);
      });
      if (result.scatterCount >= 3) {
        this.scene.showHighlights(result.scatterCells, '#b388ff');
      }
      await this.wait(450, false);
    }

    const ratio = effWin / bet;
    let tier: WinTier | null = null;
    if (result.isJackpot) tier = 'jackpot';
    else if (ratio >= 100) tier = 'legend';
    else if (ratio >= 30) tier = 'mega';
    else if (ratio >= 10) tier = 'big';

    if (effWin > 0) {
      s.coins += effWin;
      s.totalWinAmount += effWin;
      s.maxWin = Math.max(s.maxWin, effWin);
      s.consecLosses = 0;
      if (s.betIndex === BET_STEPS.length - 1) this.grantAch('maxbet_win');
      if (s.coins >= 100000) this.grantAch('rich');
      if (isFree) this.fsTotal += effWin;

      if (tier === 'jackpot') {
        this.collect('jackpot');
        this.grantAch('jackpot');
        this.ov.setAura('rainbow');
        this.sfx.jackpotSiren();
        this.fx.shake(28);
        this.fx.flash('#fff6c8', 0.9);
        this.fx.fireworksShow(14);
        this.fx.coinRain(140);
        await this.wait(1600, false);
        this.sfx.fanfare(4);
        await this.ov.showWin('jackpot', effWin, (p) => this.sfx.countTick(p));
      } else if (tier) {
        const tierNum = tier === 'legend' ? 3 : tier === 'mega' ? 2 : 1;
        if (tier === 'big') this.collect('win_big');
        if (tier === 'mega') this.collect('win_mega');
        if (tier === 'legend') this.collect('win_legend');
        this.grantAch(`win_${tier}`);
        this.sfx.fanfare(tierNum);
        this.fx.shake(8 + tierNum * 6);
        this.fx.flash('#ffd24a', 0.5);
        this.fx.coinRain(30 + tierNum * 40);
        if (tierNum >= 2) this.fx.fireworksShow(4 + tierNum * 3);
        this.fx.confettiBurst(40 + tierNum * 40);
        await this.ov.showWin(tier, effWin, (p) => this.sfx.countTick(p));
      } else {
        // 小当たり：セルからコイン噴出
        const cell = result.lineWins[0]?.cells[1] ?? [2, 1];
        const pos = this.scene.cellScreenPos(cell[0], cell[1]);
        this.fx.coinBurst(pos.x, pos.y, Math.min(8 + Math.round(ratio * 6), 40));
        if (ratio >= 3) this.fx.starBurst(pos.x, pos.y, 12);
      }
      this.hud.setCoins(s.coins);
      this.hud.setWin(effWin);
    } else if (result.freeSpins === 0) {
      // ハズレ
      s.consecLosses++;
      const r = Math.random();
      if (r < 0.012) {
        this.collect('fish');
        this.grantAch('fish');
        this.fx.fishRain(40);
        this.sfx.fishSplash();
        this.sfx.sadTrombone();
        this.hud.message('🐟 な、なんで魚！？（超レア演出です。おめでとう）');
        await this.wait(1800, false);
      } else if (r < 0.05) {
        this.collect('trombone');
        this.sfx.sadTrombone();
        this.hud.message('🎺 ズコー……次いこ次！');
        await this.wait(900, false);
      }
    }

    // フリースピン突入・再突入
    if (result.freeSpins > 0) {
      this.sfx.scatterHit();
      this.collect('freespin');
      this.fx.starBurst(window.innerWidth / 2, window.innerHeight / 2, 30);
      if (isFree) {
        this.grantAch('fs_retrigger');
        this.fsLeft += result.freeSpins;
        this.fsMult++;
        s.freespinEntries++;
        await this.ov.banner('🎊 再突入!!', `+${result.freeSpins}回 ＆ 倍率UP ×${this.fsMult}！`);
      } else {
        this.grantAch('freespin');
        this.fsLeft = result.freeSpins;
        this.fsMult = 2;
        this.fsTotal = 0;
        s.freespinEntries++;
        document.body.classList.add('fs-mode');
        this.bgm.setMood('freespin');
        await this.ov.banner('🎁 FREE SPINS!!', `${result.freeSpins}回転 ─ 配当ぜんぶ ×${this.fsMult}！`);
      }
      this.hud.setFreeSpin(this.fsLeft, this.fsMult);
    }

    // フリースピン終了
    if (isFree && this.fsLeft === 0 && result.freeSpins === 0) {
      document.body.classList.remove('fs-mode');
      this.bgm.setMood(this.feverSpins > 0 ? 'fever' : 'normal');
      this.hud.setFreeSpin(0, 2);
      await this.ov.banner('FREE SPINS 終了', `合計獲得 🪙 ${this.fsTotal.toLocaleString('ja-JP')}！`);
    }

    // フィーバー消化
    if (usingFever) {
      this.feverSpins--;
      if (this.feverSpins <= 0) {
        document.body.classList.remove('fever');
        if (this.fsLeft === 0) this.bgm.setMood('normal');
        this.ov.toast('GOD MODE 終了…また会おう');
      }
    }

    // XP・レベルアップ
    const ups = addXp(s, Math.max(1, Math.round(bet / 10)));
    for (const lv of ups) {
      const bonus = lv * 100;
      s.coins += bonus;
      this.sfx.levelUp();
      this.fx.starBurst(window.innerWidth / 2, window.innerHeight * 0.3, 24);
      this.fx.confettiBurst(50);
      const unlock = THEME_UNLOCKS.find((t) => t.level === lv);
      await this.ov.banner(
        '⬆ LEVEL UP!',
        unlock ? `Lv.${lv}！ テーマ「${unlock.name}」解放＆🪙${bonus}` : `Lv.${lv} 達成！ ボーナス 🪙${bonus}`
      );
      if (lv >= 10) this.grantAch('level_10');
      if (lv >= 20) this.grantAch('level_20');
      this.hud.setCoins(s.coins);
    }
    this.hud.setLevel(s.level, s.xp / xpForLevel(s.level));

    saveSave(s);
    this.spinning = false;
    this.hud.setSpinState('idle');

    // 連続スピン（フリースピン・オート）
    if (this.fsLeft > 0) {
      await this.wait(750, false);
      void this.spin();
    } else if (this.auto) {
      if (s.coins >= BET_STEPS[s.betIndex]) {
        await this.wait(650, false);
        if (this.auto && !this.spinning) void this.spin();
      } else {
        this.auto = false;
        this.hud.setAuto(false);
        this.maybeOfferRescue();
      }
    } else if (s.coins < BET_STEPS[0]) {
      this.maybeOfferRescue();
    }
  }
}
