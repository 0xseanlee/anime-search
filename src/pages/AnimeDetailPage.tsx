import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAnimeById, type Anime } from '../lib/animeApi'
import { parseAnimeId, animeSlug } from '../seo/slug'
import { Seo } from '../seo/Seo'
import { animeJsonLd, breadcrumbJsonLd, faqWhereToWatchJsonLd } from '../seo/schema'
import { PLATFORMS } from '../seo/platforms'

function isBahamutUrl(url: string){ const u=(url??'').toLowerCase(); return u.includes('ani.gamer.com.tw')||u.includes('gamer.com.tw') }
function isStreamingLink(l:{site:string;url:string}){
  const s=(l.site??'').toLowerCase(), u=(l.url??'').toLowerCase()
  if(isBahamutUrl(u)) return true
  return ['crunchyroll','netflix','hulu','prime','amazon','hidive','bilibili','disney','muse','iqiyi','bahamut','gamer','ani.gamer'].some(k=> s.includes(k)||u.includes(k))
}

export default function AnimeDetailPage(){
  const { slug = '' } = useParams()
  const id = parseAnimeId(slug)
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(()=>{
    if(!id){ setErr('無效的動漫連結'); setLoading(false); return }
    setLoading(true); setErr('')
    fetchAnimeById(id).then(a=>{ if(!a) setErr('找不到該動漫'); else setAnime(a)}).catch(e=> setErr(e instanceof Error? e.message:'載入失敗')).finally(()=> setLoading(false))
  },[id])

  if(loading) return <div className="max-w-[960px] mx-auto px-4 py-10 text-sm text-zinc-500">載入中…</div>
  if(err || !anime) return (
    <div className="max-w-[960px] mx-auto px-4 py-10">
      <h1 className="text-xl font-black">找不到動漫</h1>
      <p className="mt-2 text-sm text-zinc-500">{err}</p>
      <Link to="/anime" className="mt-4 inline-block text-sm px-4 py-2 rounded-full bg-violet-600 text-white">回動漫資料庫</Link>
    </div>
  )

  const title = anime.title?.native || anime.title?.english || anime.title?.romaji || `Anime ${anime.id}`
  const romaji = anime.title?.romaji
  const english = anime.title?.english
  const sLinks = anime.externalLinks.filter(isStreamingLink)
  const relations: any[] = (anime as any)._relations ?? []
  const recs: any[] = (anime as any)._recommendations ?? []

  const pageTitle = `${title} — 動漫介紹、類型、年份與在哪看`
  const desc = (anime.description ?? '').slice(0, 155) || `${title} 的動漫介紹、類型 ${(anime.genres??[]).join('、')}、年份 ${anime.seasonYear ?? ''} 與可在哪看的平台連結一次看懂。`
  const path = `/anime/${animeSlug(anime)}`

  return (
    <>
      <Seo
        title={pageTitle}
        description={desc}
        path={path}
        image={anime.coverImage || anime.bannerImage}
        type="article"
        jsonLd={[
          animeJsonLd(anime, path),
          breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '動漫資料庫', path: '/anime' }, { name: title, path }]),
          faqWhereToWatchJsonLd(anime),
        ]}
      />
      <article className="max-w-[960px] mx-auto w-full px-3 sm:px-4 py-6">
        <nav aria-label="麵包屑" className="text-xs text-zinc-500">
          <Link to="/" className="underline hover:text-zinc-900">首頁</Link> <span>›</span> <Link to="/anime" className="underline hover:text-zinc-900">動漫資料庫</Link> <span>›</span> <span className="text-zinc-900">{title}</span>
        </nav>

        <header className="mt-4">
          <h1 className="text-[22px] sm:text-[26px] font-black leading-tight">{title}</h1>
          {(romaji || english) && <p className="mt-1 text-sm text-zinc-500">{[romaji, english].filter(Boolean).join(' / ')}</p>}
          {anime.chineseAliases?.length ? <p className="text-xs text-zinc-500">中文別名：{anime.chineseAliases.join('、')}</p> : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {anime.format && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600 text-white">{anime.format}</span>}
            {anime.episodes && <span className="text-xs px-2 py-0.5 rounded-full border bg-white">{anime.episodes} 集</span>}
            {anime.seasonYear && <span className="text-xs text-zinc-500">· {anime.seasonYear} {anime.season ?? ''}</span>}
            {anime.averageScore!=null && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">{anime.averageScore} 分</span>}
          </div>
        </header>

        <div className="mt-6 grid sm:grid-cols-[220px_1fr] gap-6">
          <div>
            {anime.coverImage ? <img src={anime.coverImage} alt={`${title} 封面`} width={440} height={600} loading="eager" decoding="async" className="w-full rounded-xl border shadow-sm object-cover aspect-[3/4]" /> : <div className="w-full aspect-[3/4] rounded-xl bg-zinc-100" />}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {anime.genres?.map(g=> <Link key={g} to={`/genres/${encodeURIComponent(g)}`} className="text-xs px-2 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">{g}</Link>)}
            </div>
            <div className="mt-3 text-xs text-zinc-500 space-y-1">
              {anime.studios?.[0] && <div>製作：{anime.studios.join('、')}</div>}
              {anime.duration && <div>片長：{anime.duration} 分</div>}
              {anime.status && <div>狀態：{anime.status}</div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/where-to-watch/${animeSlug(anime)}`} className="text-sm px-4 py-2 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700">在哪看 →</Link>
              <Link to={`/search?q=${encodeURIComponent(title)}`} className="text-sm px-4 py-2 rounded-full border bg-white hover:border-violet-300">搜尋相關</Link>
            </div>
          </div>

          <div className="space-y-6">
            {anime.bannerImage && <img src={anime.bannerImage} alt={`${title} 橫幅`} loading="lazy" decoding="async" className="w-full h-[160px] object-cover rounded-xl border hidden sm:block" />}
            {anime.description ? (
              <section aria-labelledby="desc-h">
                <h2 id="desc-h" className="text-sm font-extrabold">動漫簡介</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{anime.description}</p>
              </section>
            ) : <p className="text-sm text-zinc-500">暫無簡介。</p>}

            <section aria-labelledby="watch-h" className="rounded-2xl border bg-gradient-to-br from-violet-50 to-fuchsia-50/60 p-4">
              <h2 id="watch-h" className="text-sm font-extrabold flex items-center gap-2"><span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />可在以下平台觀看</h2>
              {sLinks.length>0 ? (
                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  {sLinks.map((l,i)=> <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:border-violet-300 text-sm">{l.site} <span className="ml-auto text-xs text-zinc-500">前往 ›</span></a>)}
                </div>
              ) : <p className="mt-2 text-sm text-zinc-500">AniList 暫未收錄串流連結，試試 <a href={`https://ani.gamer.com.tw/search.php?keyword=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="underline text-violet-600">巴哈姆特動畫瘋搜尋</a>。</p>}
              <p className="mt-2 text-[11px] text-zinc-500">依 AniList externalLinks 判斷，實際以各平台授權為準。</p>
              <Link to={`/where-to-watch/${animeSlug(anime)}`} className="mt-3 inline-block text-xs px-3 py-1.5 rounded-full bg-white border hover:border-violet-300">查看「{title} 在哪看」專頁 →</Link>
            </section>

            {(relations.length>0 || recs.length>0) && (
              <section aria-labelledby="rel-h">
                <h2 id="rel-h" className="text-sm font-extrabold">相關作品</h2>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {relations.map((r:any)=> <Link key={r.id} to={`/anime/${animeSlug(r)}`} className="rounded-xl overflow-hidden border bg-white hover:border-violet-300"><img src={r.coverImage?.large} alt={r.title?.romaji ?? ''} loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover" /><div className="p-1.5 text-[11px] leading-tight line-clamp-2">{r.title?.romaji ?? r.title?.english}</div></Link>)}
                  {recs.map((r:any)=> <Link key={r.id} to={`/anime/${animeSlug(r)}`} className="rounded-xl overflow-hidden border bg-white hover:border-violet-300"><img src={r.coverImage?.large} alt={r.title?.romaji ?? ''} loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover" /><div className="p-1.5 text-[11px] leading-tight line-clamp-2">{r.title?.romaji ?? r.title?.english}</div></Link>)}
                </div>
              </section>
            )}

            <nav aria-label="更多探索" className="border-t pt-4 text-xs flex flex-wrap gap-2">
              <Link to="/anime" className="underline hover:text-violet-600">更多動漫</Link>
              <Link to="/platforms" className="underline hover:text-violet-600">依平台瀏覽</Link>
              {anime.genres?.slice(0,2).map(g=> <Link key={g} to={`/genres/${encodeURIComponent(g)}`} className="underline hover:text-violet-600">{g}</Link>)}
              {anime.seasonYear && anime.season && <Link to={`/season/${anime.seasonYear}/${String(anime.season).toLowerCase()}`} className="underline hover:text-violet-600">{anime.seasonYear} {anime.season}</Link>}
            </nav>
          </div>
        </div>
      </article>
    </>
  )
}
