# anime-search — 動畫串流查詢（GitHub Pages 版）

輸入片名，一鍵查**在哪個串流平台有上架**。支援模糊搜尋（錯字 / 簡繁 / 拼音 / 中日英互通），資料來源 [AniList](https://anilist.co)，巴哈姆特動畫瘋一鍵搜尋補齊。

上線位址（推上 `main` 自動部署）：`https://0xseanlee.github.io/anime-search/`

## 功能

- 即時搜尋：AniList GraphQL `Page { media }` 按 `POPULARITY_DESC` 召回 + 本地模糊重排
- 串流判斷：`externalLinks` 中 `site/url` 含 Crunchyroll / Netflix / Hulu / Prime Video / Disney+ / Bilibili / Bahamut 等即視為上架；未收錄時自動補「巴哈姆特動畫瘋（搜尋）」
- 中文別名展開：`animeAlias.ts` 對照表處理「葬送的芙莉蓮 / 間諜家家酒 / 進擊的巨人」等俗名
- 本季新番：`TRENDING_DESC` 瀑布流

## 本地開發

```bash
npm ci
npm run dev     # http://localhost:5173/anime-search/
npm run build   # 輸出 dist/
npm run preview
```

## 部署（GitHub Pages）

本倉庫已含 `.github/workflows/deploy.yml`：推到 `main` 即自動 `npm ci → vite build → upload-pages-artifact → deploy-pages`。

首次推送後，到 GitHub 倉庫 **Settings → Pages** 確認 Source 為 **GitHub Actions**（不是 Branch），之後每次 push 自動上線。

> `vite.config.ts` 的 `base: '/anime-search/'` 對應 `https://0xseanlee.github.io/anime-search/`。若改為 user pages（`https://0xseanlee.github.io/`）請改為 `base: '/'`。

## 目錄

```
src/
  App.tsx                         # 頁面（Hero 搜尋 + Trending + 結果）
  components/AnimeResultItem.tsx  # 卡片 + 詳情 Modal + 平台品牌色
  lib/animeApi.ts                 # AniList GraphQL（含 fetch，不依賴 @cubelv/sdk）
  lib/animeAlias.ts               # 中文別名對照與展開
  lib/fuzzyAnime.ts / fuzzySearch.ts
```

## 授權

MIT
