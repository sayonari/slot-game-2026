// 生成BGM：ルックアヘッド・スケジューラによるステップシーケンサ

import type { AudioEngine } from './audio';

export type BgmMood = 'normal' | 'freespin' | 'fever';

interface MoodDef {
  bpm: number;
  // コード進行（ルート周波数とコードトーン比）
  chords: number[][];
  bassGain: number;
  pluckGain: number;
  arp: boolean;
}

const MOODS: Record<BgmMood, MoodDef> = {
  normal: {
    bpm: 98,
    chords: [
      [220.0, 261.63, 329.63],  // Am
      [174.61, 220.0, 261.63],  // F
      [196.0, 246.94, 293.66],  // G
      [220.0, 261.63, 329.63],  // Am
    ],
    bassGain: 0.1,
    pluckGain: 0.055,
    arp: false,
  },
  freespin: {
    bpm: 128,
    chords: [
      [261.63, 329.63, 392.0],  // C
      [196.0, 246.94, 293.66],  // G
      [220.0, 261.63, 329.63],  // Am
      [174.61, 220.0, 261.63],  // F
    ],
    bassGain: 0.12,
    pluckGain: 0.07,
    arp: true,
  },
  fever: {
    bpm: 152,
    chords: [
      [261.63, 311.13, 392.0],  // Cm…ではなく派手に
      [293.66, 369.99, 440.0],  // D
      [329.63, 415.3, 493.88],  // E
      [293.66, 369.99, 440.0],  // D
    ],
    bassGain: 0.13,
    pluckGain: 0.08,
    arp: true,
  },
};

export class Bgm {
  private mood: BgmMood = 'normal';
  private playing = false;
  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;

  constructor(private a: AudioEngine) {}

  start() {
    const ctx = this.a.ensure();
    if (!ctx || this.playing) return;
    this.playing = true;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setMood(m: BgmMood) {
    this.mood = m;
  }

  private schedule() {
    const ctx = this.a.ctx;
    if (!ctx || !this.playing) return;
    const def = MOODS[this.mood];
    const stepDur = 60 / def.bpm / 4; // 16分音符
    while (this.nextNoteTime < ctx.currentTime + 0.22) {
      this.playStep(this.step, this.nextNoteTime, def);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 64; // 4小節ループ
    }
  }

  private playStep(step: number, t: number, def: MoodDef) {
    const bar = Math.floor(step / 16) % def.chords.length;
    const chord = def.chords[bar];
    const beat = step % 16;

    // ベース（ルート、4つ打ち＋シンコペ）
    if (beat === 0 || beat === 8 || beat === 11) {
      this.a.tone({ type: 'sine', freq: chord[0] / 2, dur: 0.26, gain: def.bassGain, t0: t, bus: this.a.bgmBus });
      this.a.tone({ type: 'triangle', freq: chord[0] / 2, dur: 0.2, gain: def.bassGain * 0.5, t0: t, bus: this.a.bgmBus });
    }

    // ハット（オフビート）
    if (beat % 4 === 2) {
      this.hat(t, 0.03);
    }

    // コードプラック（小節頭と9拍目）
    if (beat === 0 || beat === 9) {
      for (const f of chord) {
        this.a.tone({ type: 'triangle', freq: f, dur: 0.5, gain: def.pluckGain, t0: t, bus: this.a.bgmBus });
      }
    }

    // アルペジオ（派手モード）
    if (def.arp && beat % 2 === 0) {
      const note = chord[(step / 2) % chord.length | 0] * 2;
      this.a.tone({ type: 'square', freq: note, dur: 0.1, gain: def.pluckGain * 0.55, t0: t, bus: this.a.bgmBus });
    }

    // 通常モードはまったり装飾音
    if (!def.arp && beat === 6 && Math.random() < 0.5) {
      const note = chord[Math.floor(Math.random() * chord.length)] * 2;
      this.a.tone({ type: 'sine', freq: note, dur: 0.4, gain: def.pluckGain * 0.7, t0: t, bus: this.a.bgmBus });
    }
  }

  private hat(t: number, gain: number) {
    const ctx = this.a.ctx;
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f);
    f.connect(g);
    g.connect(this.a.bgmBus);
    src.start(t);
  }
}
