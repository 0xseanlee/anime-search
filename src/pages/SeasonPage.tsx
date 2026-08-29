import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAnimeBySeason, type Anime } from '../lib/animeApi'
import { AnimeCard } from '../components/AnimeResultItem'
import { Seo } from '../seo/Seo'
import { seasonLabel } from '../seo/platforms'
import { animeSlug } from '../seo/slug'
import { breadcrumbJsonLd, collectionPageJsonLd, itemListJsonLd } from '../seo/schema'

const VALID: Record<string,string> = { winter:'winter', spring:'spring', summer:'summer', fall:'fall' }

export default function SeasonPage(){
  const { year='', season='' } = useParams()
  const y = Number(year)
  const s = (season ?? '').toLowerCase()
  const isValid = Number.isFinite(y) && y>=2000 && y<=2030 && !!VALID[s]

  const [items,setItems]=useState<Anime[]>([])
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')

  useEffect(()=>{
    if(!isValid){ setLoading(false); return }
    setLoading(true); setErr('')
    fetchAnimeBySeason(y, s, 24).then(setItems).catch(e=> setErr(e instanceof Error? e.message:'載入失敗')).finally(()=> setLoading(false))
  },[y,s,isValid])

  if(!isValid) return <div className="max-w-[1280px] mx-auto px-4 py-10"><h1 className="text-xl font-black">無效的季度</h1><p className="text-sm text-zinc-500 mt-2">格式：/season/:year/:season ，例如 /season/2026/summer</p><Link to="/season/2026/summer" className="mt-4 inline-block text-sm px-4 py-2 rounded-full bg-violet-600 text-white">看 2026 夏季新番</Link></div>

  const title = `${y} ${seasonLabel(s)}新番 — ${y} 年${seasonLabel(s)} 動漫一覽`
  const desc = `${y} ${seasonLabel(s)}新番、${y} ${s} 動漫：瀏覽該季新番與熱門動漫，每部可查看簡介、類型與在哪看的平台。`
  const path = `/season/${y}/${s}`

  return (
    <>
      <Seo title={title} description={desc} path={path} jsonLd={[collectionPageJsonLd(title, desc, path), breadcrumbJsonLd([{ name:'首頁', path:'/' },{ name:`${y} ${seasonLabel(s)}新番`, path }]), itemListJsonLd(title, items.slice(0,12), '/anime')]} />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <nav className="text-xs text-zinc-500"><Link to="/" className="underline">首頁</Link> › {y} › {seasonLabel(s)}新番</nav>
        <h1 className="mt-3 text-xl font-black">{y} {seasonLabel(s)}新番</h1>
        <p className="mt-1 text-sm text-zinc-500">該季新番與熱門動漫，按人氣排序。</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {['winter','spring','summer','fall'].map(k=> <Link key={k} to={`/season/${y}/${k}`} className={`px-3 py-1.5 rounded-full border ${k===s? 'bg-zinc-900 text-white border-zinc-900':'bg-white hover:border-violet-300'}`}>{seasonLabel(k)}</Link>)}
          <span className="text-zinc-400 self-center">·</span>
          {[2026,2025,2024].map(yy=> <Link key={yy} to={`/season/${yy}/${s}`} className={`px-3 py-1.5 rounded-full border ${yy===y? 'bg-zinc-900 text-white border-zinc-900':'bg-white hover:border-violet-300'}`}>{yy}</Link>)}
        </div>
        {err && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{err}</div>}
        {loading? <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_,i)=><div key={i} className="rounded-[14px] border bg-white animate-pulse"><div className="aspect-[3/4] bg-zinc-100" /><div className="h-12 bg-zinc-50" /></div>)}</div> : (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {items.map(a=> <Link key={a.id} to={`/anime/${animeSlug(a)}`}><AnimeCard anime={a} onOpen={()=>{}} /></Link>)}
            </div>
            <p className="mt-6 text-xs text-zinc-500">想找指定作品？用 <Link to="/search" className="underline text-violet-600">搜尋</Link> 或回 <Link to="/anime" className="underline text-violet-600">動漫資料庫</Link>。</p>
          </>
        )}
      </div>
    </>
  )
}
