// シンボル画像のプロシージャル生成（外部素材ゼロ・全てコード描画）

import * as THREE from 'three';
import type { SymbolDef } from '../core/config';

export interface SymbolTextures {
  normal: THREE.Texture;
  blurred: THREE.Texture;
  canvas: HTMLCanvasElement;
}

function roundRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function drawSymbolCanvas(def: SymbolDef, size = 256): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const pad = size * 0.045;
  const r = size * 0.13;
  const inner = size - pad * 2;

  // ベースパネル（暗い宝石箱風）
  roundRectPath(g, pad, pad, inner, inner, r);
  const bg = g.createLinearGradient(0, pad, 0, size - pad);
  bg.addColorStop(0, '#241345');
  bg.addColorStop(0.5, '#120a28');
  bg.addColorStop(1, '#0a0518');
  g.fillStyle = bg;
  g.fill();

  // 上部ハイライト
  roundRectPath(g, pad, pad, inner, inner * 0.5, r);
  const hl = g.createLinearGradient(0, pad, 0, pad + inner * 0.5);
  hl.addColorStop(0, 'rgba(255,255,255,0.16)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.fill();

  // ネオン枠
  roundRectPath(g, pad, pad, inner, inner, r);
  g.lineWidth = size * 0.022;
  g.strokeStyle = def.color;
  g.shadowColor = def.color;
  g.shadowBlur = size * 0.09;
  g.stroke();
  g.shadowBlur = 0;

  const cx = size / 2;
  const cy = size / 2;

  if (def.kind === 'emoji') {
    g.font = `${size * 0.54}px serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = def.color;
    g.shadowBlur = size * 0.12;
    g.fillText(def.emoji, cx, cy + size * 0.03);
    g.shadowBlur = 0;
  } else if (def.kind === 'seven') {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 italic ${size * 0.66}px 'Arial Black', sans-serif`;
    const grad = g.createLinearGradient(0, cy - size * 0.3, 0, cy + size * 0.3);
    grad.addColorStop(0, '#ffd5d5');
    grad.addColorStop(0.45, '#ff4455');
    grad.addColorStop(1, '#990011');
    g.shadowColor = '#ff2233';
    g.shadowBlur = size * 0.14;
    g.fillStyle = grad;
    g.fillText('7', cx, cy + size * 0.04);
    g.shadowBlur = 0;
    g.lineWidth = size * 0.016;
    g.strokeStyle = '#fff';
    g.strokeText('7', cx, cy + size * 0.04);
  } else if (def.kind === 'bar') {
    const bw = inner * 0.72;
    const bh = inner * 0.2;
    for (let i = 0; i < 3; i++) {
      const by = cy - inner * 0.31 + i * (bh + inner * 0.06);
      roundRectPath(g, cx - bw / 2, by, bw, bh, bh * 0.3);
      const gold = g.createLinearGradient(0, by, 0, by + bh);
      gold.addColorStop(0, '#fff0b0');
      gold.addColorStop(0.5, '#ffc62a');
      gold.addColorStop(1, '#9a6a00');
      g.fillStyle = gold;
      g.shadowColor = '#ffae00';
      g.shadowBlur = size * 0.05;
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#241345';
      g.font = `900 ${bh * 0.72}px 'Arial Black', sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('BAR', cx, by + bh * 0.55);
    }
  } else if (def.kind === 'wild') {
    // 虹のWILDプレート
    roundRectPath(g, pad * 2.4, cy - inner * 0.26, inner - pad * 2.8, inner * 0.52, r * 0.7);
    const rb = g.createLinearGradient(pad, 0, size - pad, 0);
    rb.addColorStop(0, '#ff4444');
    rb.addColorStop(0.25, '#ffdd44');
    rb.addColorStop(0.5, '#44ff88');
    rb.addColorStop(0.75, '#4488ff');
    rb.addColorStop(1, '#ff44dd');
    g.fillStyle = rb;
    g.shadowColor = '#ff5cf0';
    g.shadowBlur = size * 0.1;
    g.fill();
    g.shadowBlur = 0;
    g.font = `900 ${size * 0.21}px 'Arial Black', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = size * 0.035;
    g.strokeStyle = '#1a0830';
    g.strokeText('WILD', cx, cy + size * 0.01);
    g.fillStyle = '#ffffff';
    g.fillText('WILD', cx, cy + size * 0.01);
    // キラキラ
    g.fillStyle = '#fff';
    for (const [sx, sy, ss] of [[0.26, 0.24, 0.05], [0.76, 0.7, 0.04], [0.7, 0.22, 0.03]] as const) {
      const px = size * sx, py = size * sy, ps = size * ss;
      g.beginPath();
      g.moveTo(px, py - ps); g.quadraticCurveTo(px, py, px + ps, py);
      g.quadraticCurveTo(px, py, px, py + ps); g.quadraticCurveTo(px, py, px - ps, py);
      g.quadraticCurveTo(px, py, px, py - ps);
      g.fill();
    }
  } else if (def.kind === 'scatter') {
    // 金の星バースト＋BONUS
    g.save();
    g.translate(cx, cy - size * 0.04);
    g.beginPath();
    const spikes = 8;
    const outer = inner * 0.34;
    const innerR = outer * 0.5;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : innerR;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.closePath();
    const star = g.createRadialGradient(0, 0, 0, 0, 0, outer);
    star.addColorStop(0, '#fff6c8');
    star.addColorStop(0.6, '#ffc62a');
    star.addColorStop(1, '#b377ff');
    g.fillStyle = star;
    g.shadowColor = '#b388ff';
    g.shadowBlur = size * 0.13;
    g.fill();
    g.restore();
    g.shadowBlur = 0;
    g.font = `900 ${size * 0.155}px 'Arial Black', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = size * 0.03;
    g.strokeStyle = '#2a1050';
    g.strokeText('BONUS', cx, cy + inner * 0.31);
    g.fillStyle = '#e8ccff';
    g.fillText('BONUS', cx, cy + inner * 0.31);
  }

  return c;
}

// 高速回転中用：縦ブラー版
export function makeBlurredCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d')!;
  g.globalAlpha = 0.16;
  for (let i = -7; i <= 7; i++) {
    g.drawImage(src, 0, i * src.height * 0.04);
  }
  return c;
}

export function makeSymbolTextures(defs: SymbolDef[]): SymbolTextures[] {
  return defs.map((def) => {
    const canvas = drawSymbolCanvas(def);
    const normal = new THREE.CanvasTexture(canvas);
    normal.colorSpace = THREE.SRGBColorSpace;
    normal.anisotropy = 4;
    const blurred = new THREE.CanvasTexture(makeBlurredCanvas(canvas));
    blurred.colorSpace = THREE.SRGBColorSpace;
    return { normal, blurred, canvas };
  });
}

// セルハイライト用のリングテクスチャ
export function makeHighlightTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  roundRectPath(g, size * 0.06, size * 0.06, size * 0.88, size * 0.88, size * 0.14);
  g.lineWidth = size * 0.06;
  g.strokeStyle = '#ffffff';
  g.shadowColor = '#ffffff';
  g.shadowBlur = size * 0.12;
  g.stroke();
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
