import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAnimeByGenre, type Anime } from '../lib/animeApi'
import { AnimeCard } from '../components/AnimeResultItem'
import { Seo } from '../seo/Seo'
import { GENRES } from '../seo/platforms'
import { animeSlug } from '../seo/slug'
import { breadcrumbJsonLd, collectionPageJsonLd, itemListJsonLd } from '../seo/schema'

export default function GenresIndexPage(){
  return (
    <>
      <Seo title="動漫類型一覽" description="依類型瀏覽動漫：Action、Fantasy、Romance、Comedy、Sci-Fi、Slice of Life 等，點類型查看該類型的熱門動漫與在哪看。" path="/genres/Action" jsonLd={[collectionPageJsonLd('動漫類型', '依類型瀏覽動漫', '/genres/Action')]} />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <h1 className="text-xl font-black">動漫類型</h1>
        <div className="mt-4 flex flex-wrap gap-2">{GENRES.map(g=> <Link key={g} to={`/genres/${encodeURIComponent(g)}`} className="px-3 py-1.5 rounded-full border bg-white hover:border-violet-300 text-xs font-semibold">{g}</Link>)}</div>
      </div>
    </>
  )
}

export function GenrePage(){
  const { genre='' } = useParams()
  const decoded = decodeURIComponent(genre)
  const [items,setItems]=useState<Anime[]>([])
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')
  useEffect(()=>{
    setLoading(true); setErr('')
    fetchAnimeByGenre(decoded, 24).then(setItems).catch(e=> setErr(e instanceof Error? e.message:'載入失敗')).finally(()=> setLoading(false))
  },[decoded])
  const title = `${decoded} 動漫 — ${decoded} 類型動漫推薦`
  const desc = `${decoded} 動漫、${decoded} 類型推薦：瀏覽 ${decoded} 的熱門動漫，每部可查看簡介、年份與在哪看的平台連結。`
  const path = `/genres/${encodeURIComponent(decoded)}`
  return (
    <>
      <Seo title={title} description={desc} path={path} jsonLd={[collectionPageJsonLd(title, desc, path), breadcrumbJsonLd([{ name:'首頁', path:'/' },{ name:'類型', path:'/genres/Action' },{ name: decoded, path }]), itemListJsonLd(title, items.slice(0,12), '/anime')]} />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <nav className="text-xs text-zinc-500"><Link to="/" className="underline">首頁</Link> › 類型 › {decoded}</nav>
        <h1 className="mt-3 text-xl font-black">{decoded} 動漫</h1>
        <p className="mt-1 text-sm text-zinc-500">{decoded} 類型的熱門動漫精選。</p>
        <div className="mt-3 flex flex-wrap gap-2">{GENRES.map(g=> <Link key={g} to={`/genres/${encodeURIComponent(g)}`} className={`text-xs px-3 py-1 rounded-full border ${g===decoded? 'bg-zinc-900 text-white border-zinc-900':'bg-white hover:border-violet-300'}`}>{g}</Link>)}</div>
        {err && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{err}</div>}
        {loading? <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_,i)=><div key={i} className="rounded-[14px] border bg-white animate-pulse"><div className="aspect-[3/4] bg-zinc-100" /><div className="h-12 bg-zinc-50" /></div>)}</div> : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {items.map(a=> <Link key={a.id} to={`/anime/${animeSlug(a)}`}><AnimeCard anime={a} onOpen={()=>{}} /></Link>)}
          </div>
        )}
      </div>
    </>
  )
}
