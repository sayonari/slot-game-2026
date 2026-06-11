// スロット抽選・配当評価エンジン

import {
  REELS, ROWS, LINES, PAYLINES, SYMBOLS,
  WILD_ID, SCATTER_ID, SCATTER_FREESPINS, SCATTER_PAYS,
  buildStrips,
} from './config';

export interface LineWin {
  line: number;
  symbol: number;
  count: number;
  win: number;
  cells: [number, number][]; // [reel, row]
}

export interface SpinResult {
  stops: number[];
  grid: number[][]; // [reel][row]
  lineWins: LineWin[];
  scatterCount: number;
  scatterCells: [number, number][];
  freeSpins: number;
  scatterWin: number;
  lineWinTotal: number;
  totalWin: number;
  isJackpot: boolean;
}

export interface SpinOptions {
  rerolls?: number;   // ハズレ時の引き直し回数（フィーバー用）
  forceWin?: boolean; // 当たりが出るまで引き直す（救済・天井用）
}

export class SlotEngine {
  strips: number[][] = buildStrips();

  gridFromStops(stops: number[]): number[][] {
    return stops.map((s, r) => {
      const strip = this.strips[r];
      const col: number[] = [];
      for (let row = 0; row < ROWS; row++) col.push(strip[(s + row) % strip.length]);
      return col;
    });
  }

  randomStops(): number[] {
    return this.strips.map((st) => Math.floor(Math.random() * st.length));
  }

  evaluate(stops: number[], betTotal: number): SpinResult {
    const grid = this.gridFromStops(stops);
    const lineBet = betTotal / LINES;
    const lineWins: LineWin[] = [];

    for (let li = 0; li < PAYLINES.length; li++) {
      const pat = PAYLINES[li];

      // 先頭からの一致数を数える（WILDは何にでも化ける）
      let leadingWilds = 0;
      for (let r = 0; r < REELS; r++) {
        if (grid[r][pat[r]] === WILD_ID) leadingWilds++;
        else break;
      }

      let target = -1;
      let count = 0;
      for (let r = 0; r < REELS; r++) {
        const sym = grid[r][pat[r]];
        if (sym === SCATTER_ID) break;
        if (sym === WILD_ID) { count++; continue; }
        if (target === -1) { target = sym; count++; continue; }
        if (sym === target) { count++; continue; }
        break;
      }
      if (target === -1) target = WILD_ID; // 全部WILD

      // 「WILDだけの並び」の配当と「WILD込みのシンボル並び」の配当の高い方を採用
      const candA = count >= 3 && target >= 0 ? SYMBOLS[target].pays[Math.min(count, 5) - 3] * lineBet : 0;
      const candW = leadingWilds >= 3 ? SYMBOLS[WILD_ID].pays[Math.min(leadingWilds, 5) - 3] * lineBet : 0;

      if (candA <= 0 && candW <= 0) continue;
      const useWildLine = candW > candA;
      const useCount = useWildLine ? leadingWilds : count;
      const useSymbol = useWildLine ? WILD_ID : target;
      const useWin = Math.max(candA, candW);
      const cells: [number, number][] = [];
      for (let r = 0; r < useCount; r++) cells.push([r, pat[r]]);
      lineWins.push({ line: li, symbol: useSymbol, count: useCount, win: useWin, cells });
    }

    const scatterCells: [number, number][] = [];
    grid.forEach((col, r) =>
      col.forEach((sym, row) => {
        if (sym === SCATTER_ID) scatterCells.push([r, row]);
      })
    );
    const sc = Math.min(scatterCells.length, 5);
    const freeSpins = SCATTER_FREESPINS[sc] ?? 0;
    const scatterWin = (SCATTER_PAYS[sc] ?? 0) * betTotal;
    const lineWinTotal = lineWins.reduce((a, w) => a + w.win, 0);
    const isJackpot = lineWins.some((w) => w.symbol === WILD_ID && w.count === 5);

    return {
      stops, grid, lineWins,
      scatterCount: scatterCells.length, scatterCells,
      freeSpins, scatterWin, lineWinTotal,
      totalWin: lineWinTotal + scatterWin,
      isJackpot,
    };
  }

  spin(betTotal: number, opts: SpinOptions = {}): SpinResult {
    let best = this.evaluate(this.randomStops(), betTotal);
    let tries = opts.forceWin ? 40 : (opts.rerolls ?? 0);
    while (tries-- > 0 && best.totalWin <= 0 && best.freeSpins === 0) {
      const r = this.evaluate(this.randomStops(), betTotal);
      if (r.totalWin > best.totalWin || r.freeSpins > 0) best = r;
      if (best.totalWin > 0 || best.freeSpins > 0) break;
    }
    return best;
  }
}
