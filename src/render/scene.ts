// Three.js による3Dリール描画

import * as THREE from 'three';
import { REELS, ROWS } from '../core/config';
import type { SymbolTextures } from './symbolTexture';
import { makeHighlightTexture } from './symbolTexture';

const CELL = 1.0;
const REEL_GAP = 1.08;
const PLANES = 5; // 表示中3行＋上下バッファ

type ReelState = 'idle' | 'spinning' | 'stopping';

interface StopOpts {
  ahead?: number; // 停止までの最低回転シンボル数
  dur?: number;   // 減速時間（秒）
}

function easeOutBack(t: number, s = 1.35): number {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

class Reel {
  group = new THREE.Group();
  strip: number[] = [];
  pos = 0;
  state: ReelState = 'idle';
  private speed = 0;
  private dispSpeed = 0;
  private stopFrom = 0;
  private stopTarget = 0;
  private stopT = 0;
  private stopDur = 0.6;
  private resolveStop: (() => void) | null = null;
  private mats: THREE.MeshBasicMaterial[] = [];
  private meshes: THREE.Mesh[] = [];

  constructor(private textures: SymbolTextures[]) {
    const geo = new THREE.PlaneGeometry(CELL * 0.96, CELL * 0.96);
    for (let j = 0; j < PLANES; j++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      this.mats.push(mat);
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  private symbolAt(k: number): number {
    const n = this.strip.length;
    return this.strip[((k % n) + n) % n];
  }

  startSpin() {
    this.state = 'spinning';
  }

  stopAt(stopIndex: number, opts: StopOpts = {}): Promise<void> {
    const n = this.strip.length;
    const ahead = opts.ahead ?? 2;
    let target = Math.ceil(this.pos + ahead);
    const mod = ((target % n) + n) % n;
    target += (stopIndex - mod + n) % n;
    this.stopFrom = this.pos;
    this.stopTarget = target;
    this.stopT = 0;
    this.stopDur = opts.dur ?? 0.62;
    this.state = 'stopping';
    return new Promise((res) => {
      this.resolveStop = res;
    });
  }

  // クイックストップ：減速を短縮
  hurry() {
    if (this.state === 'stopping' && this.stopDur - this.stopT > 0.16) {
      // 現在位置から最短で止まるよう減速し直す
      const n = this.strip.length;
      const targetMod = ((this.stopTarget % n) + n) % n;
      let target = Math.ceil(this.pos + 0.5);
      const mod = ((target % n) + n) % n;
      target += (targetMod - mod + n) % n;
      this.stopFrom = this.pos;
      this.stopTarget = target;
      this.stopT = 0;
      this.stopDur = 0.18;
    }
  }

  get settled(): boolean {
    return this.state === 'idle';
  }

  update(dt: number) {
    const prev = this.pos;
    if (this.state === 'spinning') {
      this.speed = Math.min(this.speed + dt * 70, 26);
      this.pos += this.speed * dt;
    } else if (this.state === 'stopping') {
      this.stopT += dt;
      const t = Math.min(this.stopT / this.stopDur, 1);
      this.pos = this.stopFrom + (this.stopTarget - this.stopFrom) * easeOutBack(t);
      if (t >= 1) {
        this.pos = this.stopTarget;
        this.state = 'idle';
        this.speed = 0;
        const res = this.resolveStop;
        this.resolveStop = null;
        if (res) res();
      }
    }
    this.dispSpeed = dt > 0 ? (this.pos - prev) / dt : 0;

    const base = Math.floor(this.pos);
    const frac = this.pos - base;
    const fast = Math.abs(this.dispSpeed) > 11;
    for (let j = 0; j < PLANES; j++) {
      const sym = this.symbolAt(base + j - 1);
      const tex = this.textures[sym];
      const mat = this.mats[j];
      const map = fast ? tex.blurred : tex.normal;
      if (mat.map !== map) {
        mat.map = map;
        mat.needsUpdate = true;
      }
      const y = (1 - (j - 1) - frac) * CELL;
      const mesh = this.meshes[j];
      mesh.position.y = y;
      mesh.position.z = -Math.abs(y) * 0.22;
      mesh.rotation.x = -y * 0.24;
      mat.opacity = THREE.MathUtils.clamp((1.5 - Math.abs(y)) / 0.45, 0, 1);
    }
  }
}

export class SlotScene {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene = new THREE.Scene();
  private reels: Reel[] = [];
  private highlightGroup = new THREE.Group();
  private highlightTex = makeHighlightTexture();
  private hlTime = 0;

  constructor(canvas: HTMLCanvasElement, textures: SymbolTextures[], strips: number[][]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    this.camera.position.set(0, 0, 7.4);

    // リール背景の暗幕
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(REELS * REEL_GAP + 0.5, ROWS * CELL + 0.55),
      new THREE.MeshBasicMaterial({ color: 0x05020e, transparent: true, opacity: 0.72 })
    );
    back.position.z = -0.62;
    this.scene.add(back);

    // リール間のセパレーター
    for (let i = 1; i < REELS; i++) {
      const sep = new THREE.Mesh(
        new THREE.PlaneGeometry(0.025, ROWS * CELL + 0.4),
        new THREE.MeshBasicMaterial({ color: 0x2a1a55, transparent: true, opacity: 0.85 })
      );
      sep.position.x = (i - REELS / 2) * REEL_GAP;
      sep.position.z = 0.3;
      this.scene.add(sep);
    }

    for (let r = 0; r < REELS; r++) {
      const reel = new Reel(textures);
      reel.strip = strips[r];
      reel.pos = Math.floor(Math.random() * strips[r].length);
      reel.group.position.x = (r - (REELS - 1) / 2) * REEL_GAP;
      this.reels.push(reel);
      this.scene.add(reel.group);
    }

    this.scene.add(this.highlightGroup);
    this.resize();
  }

  startSpin() {
    for (const r of this.reels) r.startSpin();
  }

  stopReel(i: number, stopIndex: number, opts: StopOpts = {}): Promise<void> {
    return this.reels[i].stopAt(stopIndex, opts);
  }

  hurryAll() {
    for (const r of this.reels) r.hurry();
  }

  isReelSettled(i: number): boolean {
    return this.reels[i].settled;
  }

  showHighlights(cells: [number, number][], colorHex: string) {
    const color = new THREE.Color(colorHex);
    for (const [reel, row] of cells) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.highlightTex,
        transparent: true,
        color,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), mat);
      mesh.position.set((reel - (REELS - 1) / 2) * REEL_GAP, (1 - row) * CELL, 0.4);
      this.highlightGroup.add(mesh);
    }
  }

  clearHighlights() {
    for (const child of [...this.highlightGroup.children]) {
      this.highlightGroup.remove(child);
      const mesh = child as THREE.Mesh;
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    }
  }

  // セルの画面座標（パーティクル・ライン描画用）
  cellScreenPos(reel: number, row: number): { x: number; y: number } {
    const v = new THREE.Vector3((reel - (REELS - 1) / 2) * REEL_GAP, (1 - row) * CELL, 0.4);
    v.project(this.camera);
    const el = this.renderer.domElement;
    return {
      x: ((v.x + 1) / 2) * el.clientWidth,
      y: ((1 - v.y) / 2) * el.clientHeight,
    };
  }

  // リール窓全体の画面上の矩形（DOMフレーム配置用）
  windowScreenRect(): { x: number; y: number; w: number; h: number } {
    const halfW = (REELS * REEL_GAP) / 2 + 0.18;
    const halfH = (ROWS * CELL) / 2 + 0.22;
    const tl = new THREE.Vector3(-halfW, halfH, 0.4).project(this.camera);
    const br = new THREE.Vector3(halfW, -halfH, 0.4).project(this.camera);
    const el = this.renderer.domElement;
    const x1 = ((tl.x + 1) / 2) * el.clientWidth;
    const y1 = ((1 - tl.y) / 2) * el.clientHeight;
    const x2 = ((br.x + 1) / 2) * el.clientWidth;
    const y2 = ((1 - br.y) / 2) * el.clientHeight;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  update(dt: number) {
    for (const r of this.reels) r.update(dt);
    this.hlTime += dt;
    const pulse = 0.55 + 0.45 * Math.sin(this.hlTime * 9);
    for (const child of this.highlightGroup.children) {
      const mesh = child as THREE.Mesh;
      (mesh.material as THREE.MeshBasicMaterial).opacity = pulse;
      const s = 1 + 0.04 * Math.sin(this.hlTime * 9);
      mesh.scale.set(s, s, 1);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // リール全体が必ず収まるようカメラ距離を調整
    const halfW = (REELS * REEL_GAP) / 2 + 0.65;
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const distForWidth = halfW / (Math.tan(fovRad / 2) * this.camera.aspect);
    const distForHeight = ((ROWS * CELL) / 2 + 1.5) / Math.tan(fovRad / 2);
    this.camera.position.z = Math.max(distForWidth, distForHeight, 6.4);
    // 縦長画面ではリールをやや上に
    this.camera.position.y = w < h ? -0.55 : -0.15;
    this.camera.lookAt(0, this.camera.position.y * 0.4, 0);
    this.camera.updateProjectionMatrix();
  }
}
