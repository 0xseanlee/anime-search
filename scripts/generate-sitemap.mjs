/**
 * 動態 sitemap 產生器 — 用 AniList 熱門/趨勢/季度資料擴充長尾頁面
 * Run:  node scripts/generate-sitemap.mjs
 * Env:  GITHUB_PAGES_ORIGIN=https://0xseanlee.github.io  BASE=/anime-search
 * 輸出: public/sitemap.xml（同時會被 vite build 複製到 dist）
 * 失敗安全：任一步失敗仍保留靜態兜底，不阻斷 build
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const ORIGIN = process.env.GITHUB_PAGES_ORIGIN ?? 'https://0xseanlee.github.io'
const BASE = process.env.BASE ?? '/anime-search'
const SITE = `${ORIGIN}${BASE}`

function slugify(input){
  return (input ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60)
}
function animeSlug(a){
  const base = a?.title?.english || a?.title?.romaji || a?.title?.native || String(a.id)
  const kebab = slugify(base)
  return kebab ? `${kebab}-${a.id}` : String(a.id)
}

const MEDIA_CORE = `id title{ romaji english native }`

async function ani(query, variables){
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Accept:'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const j = await r.json()
  if(!r.ok) throw new Error(j?.errors?.[0]?.message || `HTTP ${r.status}`)
  if(j.errors?.length) throw new Error(j.errors[0].message)
  return j
}

async function getPools(){
  const trending = await ani(`query($perPage:Int){ Page(perPage:$perPage){ media(sort:TRENDING_DESC type:ANIME isAdult:false){ ${MEDIA_CORE} } } }`, { perPage: 30 }).then(j=> j.data.Page.media).catch(()=>[])
  const popular = await ani(`query($perPage:Int){ Page(perPage:$perPage){ media(sort:POPULARITY_DESC type:ANIME isAdult:false){ ${MEDIA_CORE} } } }`, { perPage: 30 }).then(j=> j.data.Page.media).catch(()=>[])
  const byId = new Map()
  for(const m of [...trending, ...popular]) if(!byId.has(m.id)) byId.set(m.id, m)
  return [...byId.values()]
}

function staticUrls(){
  const plats = ['bahamut','crunchyroll','netflix','disney-plus','prime-video','bilibili','hulu','hidive','iqiyi','muse']
  const genres = ['Action','Adventure','Comedy','Drama','Fantasy','Romance','Sci-Fi','Slice of Life']
  const seasons = ['2026/summer','2026/spring','2025/fall','2025/summer']
  const s = [
    { loc: `${SITE}/`, changefreq:'daily', priority:'1.0' },
    { loc: `${SITE}/anime`, changefreq:'daily', priority:'0.9' },
    { loc: `${SITE}/search`, changefreq:'weekly', priority:'0.5' },
    { loc: `${SITE}/platforms`, changefreq:'weekly', priority:'0.7' },
  ]
  for(const p of plats) s.push({ loc: `${SITE}/platform/${p}`, changefreq:'weekly', priority:'0.6' })
  for(const g of genres) s.push({ loc: `${SITE}/genres/${encodeURIComponent(g)}`, changefreq:'weekly', priority:'0.6' })
  for(const ss of seasons) s.push({ loc: `${SITE}/season/${ss}`, changefreq:'weekly', priority:'0.7' })
  return s
}

async function main(){
  const pools = await getPools().catch(()=>[])
  const urls = staticUrls()
  for(const a of pools.slice(0, 60)){
    const slug = animeSlug(a)
    urls.push({ loc: `${SITE}/anime/${slug}`, changefreq:'weekly', priority:'0.8' })
    urls.push({ loc: `${SITE}/where-to-watch/${slug}`, changefreq:'weekly', priority:'0.75' })
  }
  const seen = new Set(); const uniq=[]
  for(const u of urls){ if(!seen.has(u.loc)){ seen.add(u.loc); uniq.push(u)} }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniq.map(u=> `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`
  mkdirSync('public', { recursive: true })
  writeFileSync('public/sitemap.xml', xml, 'utf8')
  // dist 也寫一份（若已存在 build）
  try{ mkdirSync('dist', { recursive: true }); writeFileSync('dist/sitemap.xml', xml, 'utf8') }catch{}
  console.log(`sitemap: ${uniq.length} urls`)
}
main().catch(e=>{ console.warn('[sitemap]', e?.message ?? e); process.exit(0) })
