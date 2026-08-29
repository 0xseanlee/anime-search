import { resolveAliases, chineseAliasesForAnime } from './animeAlias'

export interface AnimeTitle { romaji?: string; english?: string; native?: string }
export interface AnimeExternalLink { site: string; url: string }
export interface Anime {
  id: number
  title?: AnimeTitle
  synonyms?: string[]
  format?: string
  status?: string
  episodes?: number
  duration?: number
  averageScore?: number
  popularity?: number
  seasonYear?: number
  season?: string
  genres?: string[]
  coverImage?: string
  coverColor?: string
  bannerImage?: string
  description?: string
  studios?: string[]
  externalLinks: AnimeExternalLink[]
  chineseAliases?: string[]
}

const ANILIST_URL = 'https://graphql.anilist.co'

const MEDIA_FIELDS = `
      id
      title { romaji english native }
      synonyms
      format
      status
      episodes
      duration
      averageScore
      popularity
      seasonYear
      season
      genres
      description(asHtml: false)
      coverImage { extraLarge large color }
      bannerImage
      studios(isMain: true) { nodes { name } }
      externalLinks { site url }
`

function mapMedia(m: any): Anime {
  const base: Anime = {
    id: m.id,
    title: m.title ?? {},
    synonyms: m.synonyms ?? [],
    format: m.format,
    status: m.status,
    episodes: m.episodes,
    duration: m.duration,
    averageScore: m.averageScore,
    popularity: m.popularity,
    seasonYear: m.seasonYear,
    season: m.season,
    genres: m.genres ?? [],
    coverImage: m.coverImage?.extraLarge ?? m.coverImage?.large ?? '',
    coverColor: m.coverImage?.color ?? '',
    bannerImage: m.bannerImage ?? '',
    description: (m.description ?? '').replace(/<[^>]*>/g, '').slice(0, 900),
    studios: (m.studios?.nodes ?? []).map((n: any) => n.name).slice(0, 2),
    externalLinks: (m.externalLinks ?? [])
      .filter((l: any) => l.url)
      .map((l: any) => ({ site: l.site ?? '', url: l.url })),
  }
  try {
    const zh = chineseAliasesForAnime({ title: base.title, synonyms: base.synonyms })
    if (zh.length) base.chineseAliases = zh
  } catch { /* ignore */ }
  return base
}

async function aniFetch(query: string, variables: Record<string, unknown>): Promise<any> {
  const resp = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const text = await resp.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-json */ }
  if (!resp.ok) {
    const msg = data?.errors?.[0]?.message ?? data?.error ?? text.slice(0, 300)
    throw new Error(msg ? `AniList ${resp.status}: ${msg}` : `AniList HTTP ${resp.status}`)
  }
  if (data?.errors?.length) throw new Error(data.errors[0].message ?? 'AniList GraphQL error')
  return data
}

async function searchAnimeWith(term: string): Promise<Anime[]> {
  const gql = `
query ($search: String) {
  Page(perPage: 12) {
    media(search: $search, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS}
    }
  }
}`
  const data = await aniFetch(gql, { search: term })
  const list = data?.data?.Page?.media ?? []
  return list.map(mapMedia)
}

export async function searchAnime(query: string): Promise<Anime[]> {
  const { expanded } = resolveAliases(query)
  const seen = new Set<number>()
  const out: Anime[] = []
  const terms = expanded.slice(0, 3)
  const batches = await Promise.all(terms.map((t) => searchAnimeWith(t).catch(() => [] as Anime[])))
  for (const batch of batches) {
    for (const a of batch) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      out.push(a)
    }
  }
  return out.slice(0, 15)
}

export async function fetchTrendingAnime(limit = 12): Promise<Anime[]> {
  const perPage = Math.min(Math.max(limit, 1), 50)
  const gql = `
query ($perPage: Int) {
  Page(perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}`
  try {
    const data = await aniFetch(gql, { perPage })
    const list = data?.data?.Page?.media ?? []
    return list.map(mapMedia)
  } catch (e) {
    const fallbackGql = `
query {
  Page(perPage: ${perPage}) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      id
      title { romaji english native }
      synonyms
      format
      status
      episodes
      averageScore
      popularity
      seasonYear
      season
      genres
      coverImage { extraLarge large color }
      bannerImage
      externalLinks { site url }
    }
  }
}`
    try {
      const data2 = await aniFetch(fallbackGql, {})
      const list2 = data2?.data?.Page?.media ?? []
      return list2.map((m: any) => mapMedia({ ...m, duration: m.duration ?? null, description: m.description ?? '', studios: m.studios ?? { nodes: [] } }))
    } catch {
      throw e instanceof Error ? e : new Error(String(e))
    }
  }
}

export async function fetchPopularAnime(limit = 12): Promise<Anime[]> {
  const perPage = Math.min(Math.max(limit, 1), 50)
  const gql = `
query ($perPage: Int) {
  Page(perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }`
  const data = await aniFetch(gql, { perPage })
  const list = data?.data?.Page?.media ?? []
  return list.map(mapMedia)
}

/** 單部 by id — 用於 /anime/:slug 與 /where-to-watch/:slug */
export async function fetchAnimeById(id: number): Promise<Anime | null> {
  const gql = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    ${MEDIA_FIELDS}
    relations { edges { relationType } nodes { id title { romaji english native } coverImage { large } format status } }
    recommendations(perPage: 6, sort: RATING_DESC) { nodes { mediaRecommendation { id title { romaji english native } coverImage { large } averageScore } } }
  }
}`
  const data = await aniFetch(gql, { id })
  const m = data?.data?.Media
  if (!m) return null
  const base = mapMedia(m)
  // 附加關聯（可選，不影響既有欄位）
  const relNodes: any[] = m.relations?.nodes ?? []
  const recNodes: any[] = (m.recommendations?.nodes ?? []).map((n: any) => n.mediaRecommendation).filter(Boolean)
  ;(base as any)._relations = relNodes.slice(0, 8)
  ;(base as any)._recommendations = recNodes.slice(0, 6)
  return base
}

export async function fetchAnimeByGenre(genre: string, perPage = 18): Promise<Anime[]> {
  const gql = `
query ($genre: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(genre: $genre, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS}
    }
  }
}`
  const data = await aniFetch(gql, { genre, perPage })
  return (data?.data?.Page?.media ?? []).map(mapMedia)
}

export async function fetchAnimeBySeason(year: number, season: string, perPage = 24): Promise<Anime[]> {
  const s = season.toUpperCase()
  const gql = `
query ($year: Int, $season: MediaSeason, $perPage: Int) {
  Page(perPage: $perPage) {
    media(seasonYear: $year, season: $season, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS}
    }
  }
}`
  const data = await aniFetch(gql, { year, season: s, perPage })
  return (data?.data?.Page?.media ?? []).map(mapMedia)
}

/** 平台清單 — 以關鍵字在 externalLinks 匹配（小寫），取前 N 部熱門 */
export async function fetchAnimeByPlatformSlug(platformSlug: string, perPage = 18): Promise<Anime[]> {
  // 先抓一批熱門，再本地過濾 externalLinks，降低 AniList 查詢複雜度
  const pool = await fetchPopularAnime(50)
  const { matchPlatform } = await import('../seo/platforms')
  // 需要重新抓這些 id 的完整 links（pool 已有），直接過濾即可
  const keywords = (() => {
    const map: Record<string, string[]> = {
      bahamut: ['bahamut', 'gamer', 'ani.gamer'],
      crunchyroll: ['crunchyroll'],
      netflix: ['netflix'],
      'disney-plus': ['disney'],
      'prime-video': ['prime', 'primevideo', 'amazon'],
      bilibili: ['bilibili'],
      hulu: ['hulu'],
      hidive: ['hidive'],
      iqiyi: ['iqiyi', 'iq.com'],
      muse: ['muse'],
    }
    return map[platformSlug] ?? [platformSlug]
  })()
  const filtered = pool.filter((a) =>
    a.externalLinks.some((l) => {
      const s = (l.site ?? '').toLowerCase()
      const u = (l.url ?? '').toLowerCase()
      return keywords.some((k: string) => s.includes(k) || u.includes(k))
    })
  )
  // 若過濾太少，回退到 pool 前 N 部（避免空白頁）
  const list = filtered.length >= 6 ? filtered : pool
  void matchPlatform
  return list.slice(0, perPage)
}
