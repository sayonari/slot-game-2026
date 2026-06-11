# MEMORY

## プロジェクト概要
- 「NEON RUSH 2026 ─ 雷光スロット」：ド派手Webスロットゲーム（TypeScript + Vite + Three.js + Web Audio API）
- 公開先：https://sayonari.github.io/slot-game-2026/ （GitHub Actions → Pages 自動デプロイ）
- リポジトリ：https://github.com/sayonari/slot-game-2026
- 素材は全てコード生成（シンボル＝Canvas描画、音＝Web Audio合成）。外部素材・サーバーなし
- コード構成：src/core（抽選エンジン）、src/render（3Dリール・パーティクル）、src/audio（SFX/BGM合成）、src/state（セーブ・進行）、src/ui（HUD・モーダル・オーバーレイ）、src/game/director.ts（スピン進行統括）

## 学習した知識・教訓
- 詳細な技術知見は `.spec/KNOWLEDGE.md` に集約（重複させない）
- 演出の追加は director.ts の plan()（予告）と settle()（結果演出）に集中している
- ゲームバランス調整は src/core/config.ts（pays / weight / SCATTER_*）だけで完結する
- ローカル動作検証は Playwright（プロジェクト直下に .mjs を置いて node 実行）が使える
