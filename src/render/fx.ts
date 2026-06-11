// 2Dオーバーレイ演出：パーティクル・雷・当選ライン・シェイク・フラッシュ

type ParticleKind = 'coin' | 'confetti' | 'spark' | 'fish' | 'star';

interface Particle {
  kind: ParticleKind;
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  size: number;
  color: string;
  life: number; ttl: number;
  gravity: number;
}

interface WinLine {
  pts: { x: number; y: number }[];
  color: string;
  life: number; ttl: number;
}

interface Bolt {
  pts: { x: number; y: number }[];
  life: number; ttl: number;
}

const CONFETTI_COLORS = ['#ff2d95', '#19e3ff', '#ffd24a', '#4ade80', '#ff8c42', '#b388ff', '#ffffff'];

export class FxOverlay {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private lines: WinLine[] = [];
  private bolts: Bolt[] = [];
  private shakeAmp = 0;
  private flashAlpha = 0;
  private flashColor = '#ffffff';

  constructor(
    private canvas: HTMLCanvasElement,
    private stageEl: HTMLElement,
    private flashEl: HTMLElement
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private push(p: Partial<Particle> & { kind: ParticleKind; x: number; y: number }) {
    this.particles.push({
      vx: 0, vy: 0, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 8,
      size: 10, color: '#ffd24a', life: 0, ttl: 2, gravity: 900,
      ...p,
    });
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  coinBurst(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 250 + Math.random() * 620;
      this.push({
        kind: 'coin', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 380,
        size: 8 + Math.random() * 9, ttl: 1.6 + Math.random() * 1.2,
      });
    }
  }

  coinRain(n: number) {
    const w = window.innerWidth;
    for (let i = 0; i < n; i++) {
      this.push({
        kind: 'coin',
        x: Math.random() * w, y: -30 - Math.random() * window.innerHeight * 0.8,
        vx: (Math.random() - 0.5) * 90, vy: 150 + Math.random() * 320,
        size: 9 + Math.random() * 10, ttl: 3.4, gravity: 380,
      });
    }
  }

  confettiBurst(n: number) {
    const w = window.innerWidth;
    for (let i = 0; i < n; i++) {
      this.push({
        kind: 'confetti',
        x: Math.random() * w, y: -20 - Math.random() * 220,
        vx: (Math.random() - 0.5) * 220, vy: 120 + Math.random() * 280,
        size: 5 + Math.random() * 7,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        ttl: 3.6, gravity: 140,
      });
    }
  }

  firework(x: number, y: number, color?: string) {
    const c = color ?? CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const n = 56 + Math.floor(Math.random() * 30);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const sp = 160 + Math.random() * 360;
      this.push({
        kind: 'spark', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: 2.4 + Math.random() * 2.4, color: c,
        ttl: 0.9 + Math.random() * 0.7, gravity: 320,
      });
    }
  }

  fireworksShow(count: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.firework(w * (0.12 + Math.random() * 0.76), h * (0.12 + Math.random() * 0.4));
      }, i * 240);
    }
  }

  starBurst(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 260;
      this.push({
        kind: 'star', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 110,
        size: 11 + Math.random() * 12, ttl: 1.3, gravity: 250, color: '#fff3a0',
      });
    }
  }

  fishRain(n: number) {
    const w = window.innerWidth;
    for (let i = 0; i < n; i++) {
      this.push({
        kind: 'fish',
        x: Math.random() * w, y: -40 - Math.random() * 450,
        vx: (Math.random() - 0.5) * 60, vy: 220 + Math.random() * 260,
        size: 22 + Math.random() * 18, ttl: 3.6, gravity: 260,
        vr: (Math.random() - 0.5) * 3,
      });
    }
  }

  lightning() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const boltCount = 2 + Math.floor(Math.random() * 2);
    for (let b = 0; b < boltCount; b++) {
      const pts: { x: number; y: number }[] = [];
      let x = w * (0.2 + Math.random() * 0.6);
      let y = -10;
      pts.push({ x, y });
      const targetY = h * (0.45 + Math.random() * 0.3);
      while (y < targetY) {
        x += (Math.random() - 0.5) * 120;
        y += 30 + Math.random() * 55;
        pts.push({ x, y });
      }
      this.bolts.push({ pts, life: 0, ttl: 0.32 });
    }
    this.flash('#cfe8ff', 0.45);
  }

  addWinLine(pts: { x: number; y: number }[], color: string) {
    this.lines.push({ pts, color, life: 0, ttl: 1.6 });
  }

  clearWinLines() {
    this.lines.length = 0;
  }

  shake(intensity: number) {
    this.shakeAmp = Math.max(this.shakeAmp, intensity);
  }

  flash(color: string, alpha = 0.8) {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  update(dt: number) {
    // パーティクル
    const H = window.innerHeight + 80;
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      if (p.life >= p.ttl || p.y > H) return false;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      return true;
    });
    this.lines = this.lines.filter((l) => (l.life += dt) < l.ttl);
    this.bolts = this.bolts.filter((b) => (b.life += dt) < b.ttl);

    // シェイク
    if (this.shakeAmp > 0.4) {
      const dx = (Math.random() - 0.5) * this.shakeAmp;
      const dy = (Math.random() - 0.5) * this.shakeAmp;
      this.stageEl.style.transform = `translate(${dx}px, ${dy}px)`;
      this.shakeAmp *= Math.pow(0.0018, dt); // 指数減衰
    } else if (this.shakeAmp !== 0) {
      this.shakeAmp = 0;
      this.stageEl.style.transform = '';
    }

    // フラッシュ
    if (this.flashAlpha > 0.01) {
      this.flashEl.style.background = this.flashColor;
      this.flashEl.style.opacity = String(this.flashAlpha);
      this.flashAlpha *= Math.pow(0.004, dt);
    } else if (this.flashAlpha !== 0) {
      this.flashAlpha = 0;
      this.flashEl.style.opacity = '0';
    }
  }

  render() {
    const g = this.ctx;
    g.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 当選ライン
    for (const l of this.lines) {
      const a = l.life < 0.15 ? l.life / 0.15 : 1 - Math.max(0, (l.life - l.ttl + 0.4) / 0.4);
      g.save();
      g.globalAlpha = a * 0.9;
      g.strokeStyle = l.color;
      g.lineWidth = 5;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.shadowColor = l.color;
      g.shadowBlur = 16;
      g.beginPath();
      l.pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.stroke();
      g.restore();
    }

    // 雷
    for (const b of this.bolts) {
      const a = 1 - b.life / b.ttl;
      g.save();
      g.globalAlpha = a;
      g.strokeStyle = '#eaf6ff';
      g.lineWidth = 3.2;
      g.shadowColor = '#7ac4ff';
      g.shadowBlur = 22;
      g.beginPath();
      b.pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.stroke();
      g.lineWidth = 1.2;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.restore();
    }

    // パーティクル
    for (const p of this.particles) {
      const fade = Math.min(1, (p.ttl - p.life) / 0.45);
      g.save();
      g.globalAlpha = fade;
      g.translate(p.x, p.y);
      if (p.kind === 'coin') {
        const wScale = Math.abs(Math.cos(p.rot * 1.6));
        g.rotate(Math.sin(p.rot) * 0.4);
        const grad = g.createLinearGradient(0, -p.size, 0, p.size);
        grad.addColorStop(0, '#fff2b0');
        grad.addColorStop(0.5, '#ffc62a');
        grad.addColorStop(1, '#a87400');
        g.fillStyle = grad;
        g.beginPath();
        g.ellipse(0, 0, Math.max(p.size * wScale, 1.4), p.size, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#7a5200';
        g.lineWidth = 1.4;
        g.stroke();
        if (wScale > 0.5) {
          g.fillStyle = 'rgba(255,255,255,.8)';
          g.beginPath();
          g.ellipse(-p.size * 0.28 * wScale, -p.size * 0.3, p.size * 0.18, p.size * 0.3, -0.5, 0, Math.PI * 2);
          g.fill();
        }
      } else if (p.kind === 'confetti') {
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.kind === 'spark') {
        g.fillStyle = p.color;
        g.shadowColor = p.color;
        g.shadowBlur = 8;
        g.beginPath();
        g.arc(0, 0, p.size, 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'star') {
        g.rotate(p.rot);
        g.font = `${p.size}px serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('✨', 0, 0);
      } else if (p.kind === 'fish') {
        g.rotate(Math.sin(p.rot * 2) * 0.5);
        g.font = `${p.size}px serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('🐟', 0, 0);
      }
      g.restore();
    }
  }
}
