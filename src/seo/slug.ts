/**
 * slug 產生與解析 — 不依賴後端，純函數
 * AniList id 是唯一鍵，slug 僅為可讀與 SEO，需穩定且可逆（id→slug→id）
 * 格式：{kebab-romaji-or-english}-{id} 例如 demon-slayer-101922
 * 若只有中文，fallback 到 id
 */

export function slugify(input: string): string {
  return (input ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function animeSlug(anime: { id: number; title?: { romaji?: string; english?: string; native?: string } }): string {
  const base = anime.title?.english || anime.title?.romaji || anime.title?.native || String(anime.id)
  const kebab = slugify(base)
  // 需以 id 結尾，確保唯一與可解析
  return kebab ? `${kebab}-${anime.id}` : String(anime.id)
}

export function parseAnimeId(slug: string): number | null {
  const m = (slug ?? '').match(/-(\d+)$/)
  if (m) return Number(m[1])
  const n = Number(slug)
  return Number.isFinite(n) ? n : null
}

export function platformSlug(name: string): string {
  return slugify(name) || name.toLowerCase().replace(/\s+/g, '-')
}
