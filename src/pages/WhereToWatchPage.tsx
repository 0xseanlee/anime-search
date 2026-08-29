import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAnimeById, type Anime } from '../lib/animeApi'
import { parseAnimeId, animeSlug } from '../seo/slug'
import { Seo } from '../seo/Seo'
import { animeJsonLd, breadcrumbJsonLd, faqWhereToWatchJsonLd } from '../seo/schema'

function isBahamutUrl(url:string){ return (url??'').toLowerCase().includes('gamer.com.tw') }
function isStreamingLink(l:{site:string;url:string}){
  const s=(l.site??'').toLowerCase(), u=(l.url??'').toLowerCase()
  if(isBahamutUrl(u)) return true
  return ['crunchyroll','netflix','hulu','prime','amazon','hidive','bilibili','disney','muse','iqiyi','bahamut','gamer'].some(k=> s.includes(k)||u.includes(k))
}

export default function WhereToWatchPage(){
  const { slug='' } = useParams()
  const id = parseAnimeId(slug)
  const [anime,setAnime]=useState<Anime|null>(null)
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')
  useEffect(()=>{
    if(!id){ setErr('無效連結'); setLoading(false); return }
    setLoading(true)
    fetchAnimeById(id).then(a=>{ if(!a) setErr('找不到該動漫'); else setAnime(a)}).catch(e=> setErr(e instanceof Error? e.message:'載入失敗')).finally(()=> setLoading(false))
  },[id])
  if(loading) return <div className="max-w-[960px] mx-auto px-4 py-10 text-sm text-zinc-500">載入中…</div>
  if(err||!anime) return <div className="max-w-[960px] mx-auto px-4 py-10"><h1 className="text-xl font-black">找不到動漫</h1><p className="text-sm text-zinc-500 mt-2">{err}</p><Link to="/anime" className="mt-4 inline-block text-sm px-4 py-2 rounded-full bg-violet-600 text-white">回資料庫</Link></div>

  const title = anime.title?.native || anime.title?.english || anime.title?.romaji || `Anime ${anime.id}`
  const path = `/where-to-watch/${animeSlug(anime)}`
  const sLinks = anime.externalLinks.filter(isStreamingLink)
  const pageTitle = `${title} 在哪看？動漫觀看平台與上架資訊`
  const desc = `${title} 在哪看？整理 ${sLinks.map(l=> l.site).slice(0,4).join('、') || '巴哈姆特動畫瘋等'} 觀看平台與上架狀況，附直達連結與簡介。`

  return (
    <>
      <Seo
        title={pageTitle}
        description={desc}
        path={path}
        image={anime.coverImage || anime.bannerImage}
        jsonLd={[animeJsonLd(anime, path), breadcrumbJsonLd([{ name:'首頁', path:'/' },{ name:'動漫資料庫', path:'/anime' },{ name: title, path: `/anime/${animeSlug(anime)}` },{ name: '在哪看', path }]), faqWhereToWatchJsonLd(anime)]}
      />
      <div className="max-w-[960px] mx-auto w-full px-3 sm:px-4 py-6">
        <nav aria-label="麵包屑" className="text-xs text-zinc-500"><Link to="/" className="underline">首頁</Link> › <Link to="/anime" className="underline">動漫資料庫</Link> › <Link to={`/anime/${animeSlug(anime)}`} className="underline">{title}</Link> › 在哪看</nav>
        <h1 className="mt-3 text-[22px] font-black leading-tight">{title} 在哪看？</h1>
        <p className="mt-1 text-sm text-zinc-500">動漫上架平台 / 動漫觀看平台 — 依 AniList externalLinks 整理，實際以各平台授權為準。</p>

        <div className="mt-6 grid sm:grid-cols-[200px_1fr] gap-6">
          <img src={anime.coverImage} alt={`${title} 封面`} width={400} height={560} loading="eager" className="w-full rounded-xl border object-cover aspect-[3/4]" />
          <div className="space-y-4">
            <section aria-labelledby="watch-h" className="rounded-2xl border p-4 bg-white">
              <h2 id="watch-h" className="text-sm font-extrabold">可在哪看 — 官方串流平台</h2>
              {sLinks.length? <div className="mt-3 grid sm:grid-cols-2 gap-2">{sLinks.map((l,i)=> <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:border-violet-300 text-sm">{l.site}<span className="ml-auto text-xs text-zinc-500">前往 ›</span></a>)}</div> : <p className="mt-2 text-sm text-zinc-500">暫未收錄串流連結，試試 <a href={`https://ani.gamer.com.tw/search.php?keyword=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="underline text-violet-600">巴哈姆特動畫瘋搜尋</a>。</p>}
              <ul className="mt-3 text-xs text-zinc-500 list-disc pl-5">
                <li>常見平台：Netflix、Disney+、Crunchyroll、Prime Video、Bilibili、巴哈姆特動畫瘋、HIDIVE、愛奇藝等</li>
                <li>若需更精準，試 <Link to={`/search?q=${encodeURIComponent(title)}`} className="underline text-violet-600">搜尋「{title}」</Link> 或回 <Link to={`/anime/${animeSlug(anime)}`} className="underline text-violet-600">作品頁</Link></li>
              </ul>
            </section>

            <section aria-labelledby="meta-h" className="rounded-2xl border bg-zinc-50 p-4">
              <h2 id="meta-h" className="text-sm font-bold">作品資訊</h2>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-zinc-500">類型</dt><dd>{(anime.genres??[]).join('、') || '—'}</dd></div>
                <div><dt className="text-zinc-500">年份 / 季度</dt><dd>{anime.seasonYear ?? '—'} {anime.season ?? ''}</dd></div>
                <div><dt className="text-zinc-500">集數</dt><dd>{anime.episodes ?? '—'}</dd></div>
                <div><dt className="text-zinc-500">評分</dt><dd>{anime.averageScore ?? '—'}</dd></div>
              </dl>
            </section>

            <nav aria-label="內部連結" className="flex flex-wrap gap-2 text-xs">
              <Link to={`/anime/${animeSlug(anime)}`} className="underline">回作品頁</Link>
              <Link to="/platforms" className="underline">全部觀看平台</Link>
              <Link to="/anime" className="underline">動漫資料庫</Link>
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}
