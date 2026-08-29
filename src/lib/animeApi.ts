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
    description: (m.description ?? '').replace(/<[^>]*>/g, '').slice(0, 280),
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
  if (data?.errors?.length) {
    // GraphQL 200 但帶 errors（例如欄位不存在）
    throw new Error(data.errors[0].message ?? 'AniList GraphQL error')
  }
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

// 熱門榜單 — 對 400 做降級重試（AniList 偶發欄位/變數校驗），確保首頁不白屏
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
    // 降級：用最簡欄位 + inline perPage 重試一次
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
      // 降級的 media 缺部分欄位，補齊後映射
      return list2.map((m: any) => mapMedia({
        ...m,
        duration: m.duration ?? null,
        description: m.description ?? '',
        studios: m.studios ?? { nodes: [] },
      }))
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
  }
}`
  const data = await aniFetch(gql, { perPage })
  const list = data?.data?.Page?.media ?? []
  return list.map(mapMedia)
}
