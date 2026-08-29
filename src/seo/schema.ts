import type { Anime } from '../lib/animeApi'
import { SITE, canonical } from './site'
import { animeSlug } from './slug'

function pickTitle(a: Anime): string {
  return a.title?.native || a.title?.english || a.title?.romaji || `Anime ${a.id}`
}

function plainDesc(a: Anime): string {
  const d = (a.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  return d || `${pickTitle(a)} — 動漫簡介、類型、年份與可在哪看一次看懂。`
}

/** 單部動漫 → TVSeries / Movie 的 JSON-LD */
export function animeJsonLd(anime: Anime, path: string) {
  const title = pickTitle(anime)
  const t = anime.title ?? {}
  const url = canonical(path)
  const isMovie = anime.format === 'MOVIE'
  return {
    '@context': 'https://schema.org',
    '@type': isMovie ? 'Movie' : 'TVSeries',
    name: title,
    alternateName: [t.romaji, t.english, t.native, ...(anime.chineseAliases ?? [])].filter(Boolean),
    description: plainDesc(anime),
    image: anime.coverImage || anime.bannerImage || undefined,
    url,
    inLanguage: 'ja',
    genre: anime.genres,
    numberOfEpisodes: anime.episodes ?? undefined,
    aggregateRating: anime.averageScore ? { '@type': 'AggregateRating', ratingValue: String(anime.averageScore), bestRating: '100', worstRating: '0' } : undefined,
    productionCompany: anime.studios?.map((s) => ({ '@type': 'Organization', name: s })),
    potentialAction: {
      '@type': 'WatchAction',
      target: anime.externalLinks?.slice(0, 6).map((l) => l.url) ?? [],
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: canonical(it.path),
    })),
  }
}

export function itemListJsonLd(title: string, animes: Anime[], basePathPrefix: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: animes.length,
    itemListElement: animes.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: canonical(`${basePathPrefix}/${animeSlug(a)}`),
      name: a.title?.native || a.title?.english || a.title?.romaji || String(a.id),
    })),
  }
}

export function faqWhereToWatchJsonLd(anime: Anime) {
  const title = pickTitle(anime)
  const platforms = (anime.externalLinks ?? []).map((l) => l.site).filter(Boolean).slice(0, 6).join('、')
  const where = platforms || '巴哈姆特動畫瘋等授權平台'
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `${title} 在哪看？`,
        acceptedAnswer: { '@type': 'Answer', text: `${title} 可在 ${where} 觀看，實際以各平台授權為準。站內提供各平台直達連結與巴哈姆特搜尋入口。` },
      },
      {
        '@type': 'Question',
        name: `${title} 有幾集？`,
        acceptedAnswer: { '@type': 'Answer', text: anime.episodes ? `${title} 共 ${anime.episodes} 集。` : `${title} 集數依官方公布為準。` },
      },
      {
        '@type': 'Question',
        name: `${title} 是什麼類型？`,
        acceptedAnswer: { '@type': 'Answer', text: anime.genres?.length ? `${title} 類型包含 ${(anime.genres ?? []).join('、')}。` : `${title} 的類型資訊可參考簡介。` },
      },
    ],
  }
}

export function collectionPageJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: canonical(path),
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: `${SITE.origin}${SITE.basePath}/` },
  }
}
