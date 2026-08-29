import { useEffect } from 'react'
import { SITE, canonical } from './site'

interface SeoProps {
  title: string
  description: string
  path: string // e.g. /anime/some-anime-123 ，自動含 base + origin 轉 canonical
  image?: string
  noindex?: boolean
  jsonLd?: unknown | unknown[]
  type?: 'website' | 'article'
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'content') return
      el!.setAttribute(k, v)
    })
    document.head.appendChild(el)
  }
  el.setAttribute('content', attrs.content)
  // 確保屬性正確（首次建立時可能 selector 與 attrs 略異）
  Object.entries(attrs).forEach(([k, v]) => {
    if (k !== 'content') el!.setAttribute(k, v)
  })
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function Seo({ title, description, path, image, noindex, jsonLd, type = 'website' }: SeoProps) {
  const fullTitle = title.endsWith(SITE.titleSuffix) || title.includes('｜') ? title : `${title}${SITE.titleSuffix}`
  const url = canonical(path)
  const img = image ?? `${SITE.origin}${SITE.basePath}/og-default.png`

  useEffect(() => {
    document.title = fullTitle
    document.documentElement.lang = SITE.lang
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertLink('canonical', url)

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: img })
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: SITE.locale })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE.name })

    // Twitter
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: img })

    // robots
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' })

    // JSON-LD
    const id = 'seo-jsonld'
    document.querySelectorAll(`script[data-seo="${id}"]`).forEach((n) => n.remove())
    const inject = (data: unknown) => {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.setAttribute('data-seo', id)
      s.textContent = JSON.stringify(data)
      document.head.appendChild(s)
    }
    // 預設 Website + SearchAction
    const websiteLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      url: `${SITE.origin}${SITE.basePath}/`,
      inLanguage: SITE.locale,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE.origin}${SITE.basePath}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    }
    inject(websiteLd)
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
      arr.forEach(inject)
    }

    return () => {
      // 保留 Website 的 ld，頁面卸載時由下一頁覆蓋
    }
  }, [fullTitle, description, url, img, noindex, jsonLd, type])

  return null
}
