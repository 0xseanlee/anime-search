import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPopularAnime, fetchTrendingAnime, type Anime } from '../lib/animeApi'
import { AnimeCard } from '../components/AnimeResultItem'
import { Seo } from '../seo/Seo'
import { animeSlug } from '../seo/slug'
import { breadcrumbJsonLd, collectionPageJsonLd, itemListJsonLd } from '../seo/schema'

export default function AnimeListPage() {
  const [tab, setTab] = useState<'popular'|'trending'>('popular')
  const [items, setItems] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async ()=>{
    setLoading(true); setErr('')
    try{ setItems(tab==='popular'? await fetchPopularAnime(24): await fetchTrendingAnime(24)) }catch(e){ setErr(e instanceof Error? e.message:'載入失敗') } finally{ setLoading(false) }
  },[tab])
  useEffect(()=>{ load() },[load])

  return (
    <>
      <Seo
        title="動漫資料庫 — 熱門動漫一覽"
        description="動漫資料庫：依人氣與熱門度瀏覽動漫，每部都有獨立頁面含簡介、類型、年份、集數與在哪看／上架平台連結。"
        path="/anime"
        jsonLd={[
          collectionPageJsonLd('動漫資料庫', '依人氣瀏覽動漫', '/anime'),
          breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '動漫資料庫', path: '/anime' }]),
          itemListJsonLd('動漫資料庫', items.slice(0,12), '/anime'),
        ]}
      />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <h1 className="text-xl font-black">動漫資料庫</h1>
        <p className="mt-1 text-sm text-zinc-500">依人氣與熱門度瀏覽，點卡片進入 <code>/anime/:slug</code> 獨立 SEO 頁面。</p>
        <div className="mt-4 flex gap-2">
          <button onClick={()=>setTab('popular')} className={`text-xs px-3 py-1.5 rounded-full border ${tab==='popular'?'bg-zinc-900 text-white border-zinc-900':'bg-white'}`}>人氣</button>
          <button onClick={()=>setTab('trending')} className={`text-xs px-3 py-1.5 rounded-full border ${tab==='trending'?'bg-zinc-900 text-white border-zinc-900':'bg-white'}`}>熱門趨勢</button>
        </div>
        {err && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{err} <button onClick={load} className="underline text-violet-600 ml-2">重試</button></div>}
        {loading ? <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_,i)=><div key={i} className="rounded-[14px] border bg-white animate-pulse"><div className="aspect-[3/4] bg-zinc-100" /><div className="h-12 bg-zinc-50" /></div>)}</div> : (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {items.map(a=> <Link key={a.id} to={`/anime/${animeSlug(a)}`}><AnimeCard anime={a} onOpen={()=>{}} /></Link>)}
            </div>
            <nav aria-label="類型與季度" className="mt-8 border-t pt-4 text-xs flex flex-wrap gap-2">
              <span className="font-bold">探索：</span>
              <Link to="/season/2026/summer" className="underline hover:text-violet-600">2026 夏季新番</Link>
              <Link to="/platforms" className="underline hover:text-violet-600">依平台瀏覽</Link>
              {['Action','Fantasy','Romance'].map(g=> <Link key={g} to={`/genres/${g}`} className="underline hover:text-violet-600">{g}</Link>)}
            </nav>
          </>
        )}
      </div>
    </>
  )
}
