// 全画面オーバーレイ演出（カットイン・WIN・バナー・トースト・オーラ）

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

export type AuraTier = 'none' | 'blue' | 'green' | 'red' | 'rainbow';
export type WinTier = 'win' | 'big' | 'mega' | 'legend' | 'jackpot';

const TIER_LABEL: Record<WinTier, string> = {
  win: 'WIN!',
  big: 'BIG WIN!!',
  mega: 'MEGA WIN!!!',
  legend: 'LEGEND WIN!!!!',
  jackpot: 'JACKPOT!!!!!',
};

export class Overlays {
  private toastQueue: string[] = [];
  private toastBusy = false;

  setAura(tier: AuraTier) {
    const el = $('aura');
    el.className = '';
    if (tier !== 'none') el.classList.add('on', tier);
  }

  // カットイン演出（lv1:チャンス lv2:激アツ lv3:GOD）
  cutin(level: 1 | 2 | 3, text: string): Promise<void> {
    return new Promise((res) => {
      const el = $('cutin');
      el.className = `lv${level}`;
      const txt = $('cutin-text');
      txt.textContent = text;
      // アニメ再生し直し
      txt.style.animation = 'none';
      void txt.offsetWidth;
      txt.style.animation = '';
      setTimeout(() => {
        el.className = 'hidden';
        res();
      }, 1150);
    });
  }

  // WINオーバーレイ：カウントアップ表示。クリックでスキップ可
  showWin(tier: WinTier, amount: number, onTick: (progress: number) => void): Promise<void> {
    return new Promise((res) => {
      const el = $('winover');
      el.className = `t-${tier}`;
      $('winover-tier').textContent = TIER_LABEL[tier];
      const amtEl = $('winover-amount');
      const durMap: Record<WinTier, number> = { win: 1.0, big: 1.8, mega: 2.4, legend: 3.0, jackpot: 3.6 };
      const dur = durMap[tier];
      const start = performance.now();
      let done = false;
      let raf = 0;
      let lastTick = 0;

      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        amtEl.textContent = fmt(amount);
        setTimeout(() => {
          el.className = 'hidden';
          el.removeEventListener('click', finish);
          res();
        }, tier === 'win' ? 500 : 1100);
      };

      const step = (now: number) => {
        const t = Math.min((now - start) / (dur * 1000), 1);
        const eased = 1 - Math.pow(1 - t, 2.2);
        amtEl.textContent = fmt(amount * eased);
        if (now - lastTick > 50) {
          lastTick = now;
          onTick(t);
        }
        if (t >= 1) finish();
        else raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      el.addEventListener('click', finish);
    });
  }

  // ボーナスランクルーレット：高速回転→減速→確定
  bonusRoulette(
    ranks: { name: string; color: string }[],
    finalIndex: number,
    onTick: () => void,
    onLand: () => void
  ): Promise<void> {
    return new Promise((res) => {
      const el = $('bonus');
      const rankEl = $('bonus-rank');
      el.classList.remove('hidden');
      rankEl.classList.remove('land');
      const totalSteps = 26 + ((finalIndex - 26) % ranks.length + ranks.length) % ranks.length;
      let step = 0;
      const tick = () => {
        const i = step % ranks.length;
        rankEl.textContent = ranks[i].name;
        rankEl.style.color = ranks[i].color;
        onTick();
        step++;
        if (step <= totalSteps) {
          // だんだん減速
          const t = step / totalSteps;
          setTimeout(tick, 60 + t * t * 320);
        } else {
          rankEl.classList.add('land');
          onLand();
          setTimeout(() => {
            el.classList.add('hidden');
            res();
          }, 1700);
        }
      };
      tick();
    });
  }

  // 汎用バナー（フリースピン突入・終了・レベルアップ等）
  banner(title: string, sub: string, ms = 2000): Promise<void> {
    return new Promise((res) => {
      const el = $('banner');
      el.classList.remove('hidden');
      const t = $('banner-title');
      const s = $('banner-sub');
      t.textContent = title;
      s.textContent = sub;
      t.style.animation = 'none';
      s.style.animation = 'none';
      void t.offsetWidth;
      t.style.animation = '';
      s.style.animation = '';
      setTimeout(() => {
        el.classList.add('hidden');
        res();
      }, ms);
    });
  }

  toast(text: string) {
    this.toastQueue.push(text);
    if (!this.toastBusy) this.nextToast();
  }

  private nextToast() {
    const text = this.toastQueue.shift();
    if (text === undefined) {
      this.toastBusy = false;
      return;
    }
    this.toastBusy = true;
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    setTimeout(() => {
      el.classList.add('hidden');
      setTimeout(() => this.nextToast(), 180);
    }, 2100);
  }

  achievementToast(icon: string, name: string) {
    this.toast(`${icon} 実績解除：${name}`);
  }

  collectionToast(icon: string, name: string) {
    this.toast(`${icon} 図鑑に「${name}」を登録！`);
  }
}
