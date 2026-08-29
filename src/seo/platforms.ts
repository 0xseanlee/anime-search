/**
 * 平台統一定義 — 用於 /platform/:slug 與 /where-to-watch/:slug
 * 與 AnimeResultItem 內的 STREAM_KEYWORDS / platformBrand 保持一致
 */
export interface PlatformDef {
  slug: string
  label: string
  keywords: string[] // 用於 externalLinks 匹配（小寫）
  color: string
  fg: string
}

export const PLATFORMS: PlatformDef[] = [
  { slug: 'bahamut', label: '巴哈姆特動畫瘋', keywords: ['bahamut', 'gamer', 'ani.gamer'], color: '#00A0E9', fg: '#fff' },
  { slug: 'crunchyroll', label: 'Crunchyroll', keywords: ['crunchyroll'], color: '#FF642E', fg: '#fff' },
  { slug: 'netflix', label: 'Netflix', keywords: ['netflix'], color: '#E50914', fg: '#fff' },
  { slug: 'disney-plus', label: 'Disney+', keywords: ['disney'], color: '#113CCF', fg: '#fff' },
  { slug: 'prime-video', label: 'Prime Video', keywords: ['prime', 'primevideo', 'amazon'], color: '#00A8E1', fg: '#fff' },
  { slug: 'bilibili', label: 'Bilibili', keywords: ['bilibili'], color: '#00A1D6', fg: '#fff' },
  { slug: 'hulu', label: 'Hulu', keywords: ['hulu'], color: '#1CE783', fg: '#000' },
  { slug: 'hidive', label: 'HIDIVE', keywords: ['hidive'], color: '#00AEEF', fg: '#fff' },
  { slug: 'iqiyi', label: '愛奇藝', keywords: ['iqiyi', 'iq.com'], color: '#00CC52', fg: '#fff' },
  { slug: 'muse', label: 'Muse', keywords: ['muse'], color: '#7C3AED', fg: '#fff' },
]

export const PLATFORM_MAP = new Map(PLATFORMS.map((p) => [p.slug, p]))

export function platformBySlug(slug: string): PlatformDef | undefined {
  return PLATFORM_MAP.get(slug)
}

export function matchPlatform(site: string, url: string): PlatformDef | undefined {
  const s = (site ?? '').toLowerCase()
  const u = (url ?? '').toLowerCase()
  return PLATFORMS.find((p) => p.keywords.some((k) => s.includes(k) || u.includes(k)))
}

export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi',
  'Slice of Life', 'Sports', 'Mystery', 'Supernatural', 'Suspense', 'Avant Garde',
  'Horror', 'Ecchi', 'Music',
] as const

export const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const
export type SeasonKey = typeof SEASONS[number]

export function seasonLabel(s: string): string {
  const m: Record<string, string> = { winter: '冬季', spring: '春季', summer: '夏季', fall: '秋季' }
  return m[s] ?? s
}
