// Web Audio API 効果音エンジン（全SE合成・素材ゼロ）

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  bgmBus!: GainNode;
  private volume = 0.8;
  private muted = false;

  ensure(): AudioContext | null {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = 0.5;
      this.bgmBus.connect(this.master);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    this.applyVolume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyVolume();
  }

  private applyVolume() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(opts: {
    type?: OscillatorType;
    freq: number;
    t0?: number;
    dur?: number;
    gain?: number;
    glideTo?: number;
    attack?: number;
    bus?: GainNode;
    vibrato?: { freq: number; depth: number };
  }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = opts.t0 ?? ctx.currentTime;
    const dur = opts.dur ?? 0.2;
    const peak = opts.gain ?? 0.2;
    const attack = opts.attack ?? 0.008;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.glideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(opts.glideTo, 1), t0 + dur);
    }
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = opts.vibrato.freq;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = opts.vibrato.depth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(opts: { t0?: number; dur?: number; gain?: number; filterFreq?: number; filterTo?: number; type?: BiquadFilterType }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = opts.t0 ?? ctx.currentTime;
    const dur = opts.dur ?? 0.2;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.filterFreq ?? 1000, t0);
    if (opts.filterTo !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(opts.filterTo, 10), t0 + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
  }
}

// ============ 効果音コレクション ============

export class Sfx {
  constructor(private a: AudioEngine) {}

  click() {
    this.a.tone({ type: 'square', freq: 880, glideTo: 440, dur: 0.06, gain: 0.1 });
  }

  betChange() {
    this.a.tone({ type: 'triangle', freq: 660, dur: 0.07, gain: 0.12 });
  }

  spinStart() {
    this.a.noise({ dur: 0.4, gain: 0.16, filterFreq: 300, filterTo: 2600 });
    this.a.tone({ type: 'sawtooth', freq: 120, glideTo: 420, dur: 0.34, gain: 0.07 });
  }

  reelStop(index: number) {
    const t = this.a.now();
    this.a.tone({ type: 'triangle', freq: 190 - index * 14, dur: 0.09, gain: 0.22, t0: t });
    this.a.noise({ dur: 0.05, gain: 0.16, filterFreq: 2400, t0: t });
  }

  scatterLand() {
    const t = this.a.now();
    this.a.tone({ type: 'sine', freq: 1318, dur: 0.3, gain: 0.16, t0: t });
    this.a.tone({ type: 'sine', freq: 1760, dur: 0.4, gain: 0.14, t0: t + 0.08 });
  }

  heartbeat() {
    const t = this.a.now();
    this.a.tone({ type: 'sine', freq: 58, dur: 0.14, gain: 0.4, t0: t });
    this.a.tone({ type: 'sine', freq: 52, dur: 0.18, gain: 0.34, t0: t + 0.22 });
  }

  cutin(level: number) {
    const t = this.a.now();
    this.a.noise({ dur: 0.3, gain: 0.3, filterFreq: 3600, filterTo: 300, t0: t });
    this.a.tone({ type: 'sawtooth', freq: 1400, glideTo: 90, dur: 0.4, gain: 0.18, t0: t });
    if (level >= 2) {
      this.a.tone({ type: 'square', freq: 392, dur: 0.12, gain: 0.14, t0: t + 0.32 });
      this.a.tone({ type: 'square', freq: 523, dur: 0.22, gain: 0.16, t0: t + 0.45 });
    }
    if (level >= 3) {
      for (let i = 0; i < 5; i++) {
        this.a.tone({ type: 'square', freq: 523 + i * 130, dur: 0.1, gain: 0.12, t0: t + 0.5 + i * 0.07 });
      }
    }
  }

  thunder() {
    const t = this.a.now();
    this.a.noise({ dur: 1.1, gain: 0.4, filterFreq: 140, type: 'lowpass', t0: t });
    this.a.noise({ dur: 0.16, gain: 0.34, filterFreq: 5200, t0: t });
  }

  lineWin(size: number) {
    const t = this.a.now();
    const base = [523, 659, 784, 1047, 1319];
    const n = Math.min(3 + size, base.length);
    for (let i = 0; i < n; i++) {
      this.a.tone({ type: 'triangle', freq: base[i], dur: 0.16, gain: 0.16, t0: t + i * 0.07 });
    }
  }

  countTick(progress: number) {
    this.a.tone({ type: 'square', freq: 700 + progress * 800, dur: 0.035, gain: 0.07 });
  }

  fanfare(tier: number) {
    const t = this.a.now();
    const prog = [
      [392, 494, 587],
      [440, 554, 659],
      [494, 622, 740],
      [523, 659, 784],
    ];
    const stabs = Math.min(2 + tier, 4);
    for (let i = 0; i < stabs; i++) {
      for (const f of prog[i]) {
        this.a.tone({ type: 'sawtooth', freq: f, dur: 0.22, gain: 0.085, t0: t + i * 0.22 });
        this.a.tone({ type: 'sawtooth', freq: f * 1.005, dur: 0.22, gain: 0.085, t0: t + i * 0.22 });
      }
    }
    const tEnd = t + stabs * 0.22;
    for (const f of [523, 659, 784, 1047]) {
      this.a.tone({
        type: 'sawtooth', freq: f, dur: 1.3, gain: 0.09, t0: tEnd,
        vibrato: { freq: 6, depth: 6 },
      });
    }
    this.a.noise({ dur: 0.7, gain: 0.12, filterFreq: 7000, type: 'highpass', t0: tEnd });
  }

  jackpotSiren() {
    const t = this.a.now();
    for (let i = 0; i < 6; i++) {
      this.a.tone({ type: 'square', freq: 740, glideTo: 988, dur: 0.24, gain: 0.1, t0: t + i * 0.26 });
    }
  }

  scatterHit() {
    const t = this.a.now();
    const notes = [659, 784, 988, 1319, 1568];
    notes.forEach((f, i) => {
      this.a.tone({ type: 'triangle', freq: f, dur: 0.3, gain: 0.16, t0: t + i * 0.09 });
    });
  }

  levelUp() {
    const t = this.a.now();
    const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
    scale.forEach((f, i) => {
      this.a.tone({ type: 'triangle', freq: f, dur: 0.22, gain: 0.13, t0: t + i * 0.06 });
    });
  }

  sadTrombone() {
    const t = this.a.now();
    const seq: [number, number][] = [[392, 0], [370, 0.4], [349, 0.8], [311, 1.2]];
    for (const [f, dt] of seq) {
      this.a.tone({
        type: 'sawtooth', freq: f, glideTo: f * 0.97, dur: dt === 1.2 ? 1.1 : 0.36,
        gain: 0.14, t0: t + dt,
        vibrato: dt === 1.2 ? { freq: 5, depth: 12 } : undefined,
      });
    }
  }

  fishSplash() {
    this.a.noise({ dur: 0.5, gain: 0.2, filterFreq: 900, filterTo: 240 });
  }

  rescueRoll() {
    const t = this.a.now();
    for (let i = 0; i < 14; i++) {
      this.a.tone({ type: 'square', freq: 520 + (i % 4) * 60, dur: 0.05, gain: 0.07, t0: t + i * 0.09 });
    }
  }

  harp() {
    const t = this.a.now();
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
      this.a.tone({ type: 'sine', freq: f, dur: 0.5, gain: 0.12, t0: t + i * 0.05 });
    });
  }

  konami() {
    const t = this.a.now();
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
      this.a.tone({ type: 'square', freq: f, dur: 0.1, gain: 0.12, t0: t + i * 0.08 });
    });
  }
}
