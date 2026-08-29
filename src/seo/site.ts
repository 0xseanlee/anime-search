/** 站點級 SEO 設定 — 單一來源，改這裡就改全站 */
export const SITE = {
  name: '動漫搜尋',
  titleSuffix: '｜動漫搜尋 — 在哪看，一鍵就知道',
  description: '輸入片名，一鍵查 Crunchyroll / Netflix / 巴哈姆特等上架狀況。支援模糊搜尋、錯字/簡繁/日英互通，資料來源 AniList。',
  // GitHub Pages 網址（尾不含 slash，route 會自動加 base）
  origin: 'https://0xseanlee.github.io',
  basePath: '/anime-search',
  locale: 'zh-Hant',
  lang: 'zh-Hant',
} as const

export function canonical(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  // GitHub Pages 有 basePath，canonical 要含 base
  const full = `${SITE.origin}${SITE.basePath}${p === '/' ? '/' : p}`
  // 避免雙斜
  return full.replace(/\/+/g, '/').replace('https:/', 'https://')
}

export function ogImageUrl(title?: string): string {
  // 先用 cover fallback，未來可換成自製 og-image 產生器
  // 這裡回傳 og 預設圖 URL（Pages public）
  return `${SITE.origin}${SITE.basePath}/og-default.png`
  void title
}
