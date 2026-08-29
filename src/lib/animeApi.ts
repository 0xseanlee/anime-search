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

async function searchAnimeWith(term: string): Promise<Anime[]> {
  const gql = `
query ($search: String) {
  Page(perPage: 12) {
    media(search: $search, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS}
    }
  }
}`
  const resp = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { search: term } }),
  })
  if (!resp.ok) throw new Error(`查詢失敗（HTTP ${resp.status}）`)
  const data = await resp.json()
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
  const gql = `
query ($perPage: Int) {
  Page(perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }`
  const resp = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { perPage: limit } }),
  })
  if (!resp.ok) throw new Error(`熱門榜單載入失敗（HTTP ${resp.status}）`)
  const data = await resp.json()
  const list = data?.data?.Page?.media ?? []
  return list.map(mapMedia)
}

export async function fetchPopularAnime(limit = 12): Promise<Anime[]> {
  const gql = `
query ($perPage: Int) {
  Page(perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }`
  const resp = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { perPage: limit } }),
  })
  if (!resp.ok) throw new Error(`熱門榜單載入失敗（HTTP ${resp.status}）`)
  const data = await resp.json()
  const list = data?.data?.Page?.media ?? []
  return list.map(mapMedia)
}
