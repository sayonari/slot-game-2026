// モーダル（配当表・実績・図鑑・設定・デイリー・救済）

import { SYMBOLS, BET_STEPS } from '../core/config';
import { drawSymbolCanvas } from '../render/symbolTexture';
import type { SaveData } from '../state/save';
import { exportSave, importSave, resetSave } from '../state/save';
import { ACHIEVEMENTS, COLLECTION_ITEMS, THEME_UNLOCKS } from '../state/progression';

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

export interface ModalHandlers {
  onVolume: (v: number) => void;
  onMute: (m: boolean) => void;
  onTheme: (theme: string) => void;
  onImport: (data: SaveData) => void;
  onReset: (data: SaveData) => void;
}

export class Modals {
  isOpen = false;

  constructor(private handlers: ModalHandlers) {
    $('modal-close').addEventListener('click', () => this.close());
    $('modal-backdrop').addEventListener('click', (e) => {
      if (e.target === $('modal-backdrop')) this.close();
    });
  }

  close() {
    $('modal-backdrop').classList.add('hidden');
    this.isOpen = false;
  }

  private open(title: string) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = '';
    $('modal-backdrop').classList.remove('hidden');
    this.isOpen = true;
    return $('modal-body');
  }

  showPaytable() {
    const body = this.open('💰 配当表');
    const info = document.createElement('p');
    info.innerHTML =
      '左端から同じシンボルが3つ以上並ぶと当選（20ライン）。<br>' +
      '<b style="color:#ff5cf0">WILD</b>は何にでも化ける！ ' +
      '<b style="color:#b388ff">BONUS</b>は3個以上でフリースピン！<br>' +
      '数字は<b>ラインベット</b>（総ベット÷20）に対する倍率。';
    info.style.marginBottom = '10px';
    body.appendChild(info);
    for (const s of SYMBOLS) {
      const row = document.createElement('div');
      row.className = 'pay-row';
      const img = document.createElement('img');
      img.src = drawSymbolCanvas(s, 96).toDataURL();
      img.alt = s.name;
      row.appendChild(img);
      const name = document.createElement('div');
      name.className = 'pname';
      name.textContent = s.name;
      row.appendChild(name);
      const vals = document.createElement('div');
      vals.className = 'pvals';
      if (s.key === 'scatter') {
        vals.innerHTML = '<span><i>3個+</i>フリースピン10〜20回＋総ベット2〜50倍</span>';
      } else {
        vals.innerHTML = s.pays.map((p, i) => `<span><i>×${i + 3}</i>${p}</span>`).join('');
      }
      row.appendChild(vals);
      body.appendChild(row);
    }
    const note = document.createElement('p');
    note.style.cssText = 'margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)';
    note.textContent = `ベット額：${BET_STEPS.join(' / ')}。WILD×5が1ラインに並ぶと…JACKPOT!!`;
    body.appendChild(note);
  }

  showAchievements(save: SaveData) {
    const got = save.achievements;
    const body = this.open(`🏆 実績（${got.length} / ${ACHIEVEMENTS.length}）`);
    for (const a of ACHIEVEMENTS) {
      const has = got.includes(a.id);
      const item = document.createElement('div');
      item.className = `ach-item${has ? ' got' : ''}${a.secret ? ' secret' : ''}`;
      const icon = document.createElement('div');
      icon.className = 'ach-icon';
      icon.textContent = a.secret && !has ? '❓' : a.icon;
      const txt = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'ach-name';
      name.textContent = a.secret && !has ? '？？？' : a.name;
      const desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.textContent = a.desc;
      txt.appendChild(name);
      txt.appendChild(desc);
      item.appendChild(icon);
      item.appendChild(txt);
      body.appendChild(item);
    }
  }

  showCollection(save: SaveData) {
    const got = save.collection;
    const body = this.open(`📖 演出図鑑（${got.length} / ${COLLECTION_ITEMS.length}）`);
    const grid = document.createElement('div');
    grid.className = 'col-grid';
    for (const c of COLLECTION_ITEMS) {
      const has = got.includes(c.id);
      const cell = document.createElement('div');
      cell.className = `col-cell${has ? ' got' : ''}`;
      cell.innerHTML = `<div class="ci">${has ? c.icon : '❓'}</div><div class="cn">${has ? c.name : '？？？'}</div>`;
      grid.appendChild(cell);
    }
    body.appendChild(grid);
  }

  showSettings(save: SaveData) {
    const body = this.open('⚙️ 設定');

    // 音量
    const volRow = document.createElement('div');
    volRow.className = 'set-row';
    volRow.innerHTML = '<label>音量</label>';
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = '0';
    vol.max = '100';
    vol.value = String(Math.round(save.settings.volume * 100));
    vol.addEventListener('input', () => this.handlers.onVolume(Number(vol.value) / 100));
    volRow.appendChild(vol);
    const muteBtn = document.createElement('button');
    muteBtn.className = 'gbtn';
    muteBtn.textContent = save.settings.muted ? '🔇 ミュート中' : '🔊 ON';
    muteBtn.addEventListener('click', () => {
      save.settings.muted = !save.settings.muted;
      muteBtn.textContent = save.settings.muted ? '🔇 ミュート中' : '🔊 ON';
      this.handlers.onMute(save.settings.muted);
    });
    volRow.appendChild(muteBtn);
    body.appendChild(volRow);

    // テーマ
    const themeRow = document.createElement('div');
    themeRow.className = 'set-row';
    themeRow.innerHTML = '<label>テーマ</label>';
    for (const t of THEME_UNLOCKS) {
      const unlocked = save.level >= t.level;
      const btn = document.createElement('button');
      btn.className = 'gbtn';
      btn.textContent = unlocked ? t.name : `🔒 Lv.${t.level}`;
      btn.disabled = !unlocked;
      if (!unlocked) btn.style.opacity = '0.4';
      if (save.theme === t.theme) btn.style.borderColor = '#ffd24a';
      btn.addEventListener('click', () => {
        if (!unlocked) return;
        save.theme = t.theme;
        this.handlers.onTheme(t.theme);
        this.showSettings(save);
      });
      themeRow.appendChild(btn);
    }
    body.appendChild(themeRow);

    // エクスポート / インポート
    const ioRow = document.createElement('div');
    ioRow.className = 'set-row';
    ioRow.innerHTML = '<label>セーブデータ</label>';
    const ta = document.createElement('textarea');
    ta.className = 'set-io';
    ta.placeholder = 'エクスポートでここにコードが出ます／コードを貼ってインポート';
    const expBtn = document.createElement('button');
    expBtn.className = 'gbtn';
    expBtn.textContent = '📤 エクスポート';
    expBtn.addEventListener('click', () => {
      ta.value = exportSave(save);
      ta.select();
    });
    const impBtn = document.createElement('button');
    impBtn.className = 'gbtn';
    impBtn.textContent = '📥 インポート';
    impBtn.addEventListener('click', () => {
      const data = importSave(ta.value);
      if (data) {
        this.handlers.onImport(data);
        this.close();
      } else {
        ta.value = '※ 無効なコードです';
      }
    });
    ioRow.appendChild(expBtn);
    ioRow.appendChild(impBtn);
    ioRow.appendChild(ta);
    body.appendChild(ioRow);

    // リセット
    const resetRow = document.createElement('div');
    resetRow.className = 'set-row';
    resetRow.innerHTML = '<label>初期化</label>';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'gbtn warn';
    resetBtn.textContent = '⚠️ データを完全リセット';
    let armed = false;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        resetBtn.textContent = '本当に消しますか？（もう一度押すと実行）';
        return;
      }
      this.handlers.onReset(resetSave());
      this.close();
    });
    resetRow.appendChild(resetBtn);
    body.appendChild(resetRow);

    const credit = document.createElement('p');
    credit.style.cssText = 'margin-top:14px;font-size:11px;color:rgba(255,255,255,.45);line-height:1.6';
    credit.innerHTML =
      'NEON RUSH 2026 ─ 雷光スロット<br>グラフィック・効果音・BGMはすべてコードによる自動生成（外部素材不使用）。<br>仮想コインを使った娯楽ゲームです。換金・賭博要素はありません。';
    body.appendChild(credit);
  }

  showDaily(amount: number, streak: number, onClaim: () => void) {
    const body = this.open('📅 デイリーボーナス');
    const p = document.createElement('p');
    p.style.cssText = 'text-align:center;font-size:16px;margin:10px 0 18px';
    p.innerHTML = `本日のログインボーナス！<br><b style="font-size:30px;color:#ffd24a">🪙 ${amount.toLocaleString('ja-JP')}</b><br><span style="font-size:13px;color:rgba(255,255,255,.6)">連続ログイン ${streak} 日目</span>`;
    body.appendChild(p);
    const btn = document.createElement('button');
    btn.className = 'gbtn gold';
    btn.style.cssText += ';display:block;margin:0 auto';
    btn.textContent = '🎁 受け取る！';
    btn.addEventListener('click', () => {
      this.close();
      onClaim();
    });
    body.appendChild(btn);
  }

  showRescue(onRoll: (amount: number) => void) {
    const body = this.open('🚑 コイン切れ救済');
    const p = document.createElement('p');
    p.style.cssText = 'text-align:center;font-size:15px;margin:8px 0 16px';
    p.innerHTML = 'コインが尽きてしまった…！<br>救済ルーレットを回してカムバック！';
    body.appendChild(p);
    const disp = document.createElement('div');
    disp.style.cssText =
      'text-align:center;font-family:Bungee,sans-serif;font-size:44px;color:#19e3ff;margin-bottom:16px;text-shadow:0 0 16px #19e3ff';
    disp.textContent = '???';
    body.appendChild(disp);
    const btn = document.createElement('button');
    btn.className = 'gbtn gold';
    btn.style.cssText += ';display:block;margin:0 auto';
    btn.textContent = '🎡 ルーレットを回す';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      const amount = (3 + Math.floor(Math.random() * 8)) * 100; // 300〜1000
      let ticks = 0;
      const iv = setInterval(() => {
        ticks++;
        disp.textContent = String((3 + Math.floor(Math.random() * 8)) * 100);
        if (ticks > 13) {
          clearInterval(iv);
          disp.textContent = `🪙 ${amount}`;
          disp.style.color = '#ffd24a';
          setTimeout(() => {
            this.close();
            onRoll(amount);
          }, 900);
        }
      }, 100);
    });
    body.appendChild(btn);
  }
}
