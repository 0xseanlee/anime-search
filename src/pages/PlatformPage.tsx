import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAnimeByPlatformSlug, type Anime } from '../lib/animeApi'
import { AnimeCard } from '../components/AnimeResultItem'
import { Seo } from '../seo/Seo'
import { PLATFORM_MAP } from '../seo/platforms'
import { animeSlug } from '../seo/slug'
import { breadcrumbJsonLd, collectionPageJsonLd, itemListJsonLd } from '../seo/schema'

export default function PlatformPage(){
  const { slug='' } = useParams()
  const plat = PLATFORM_MAP.get(slug)
  const [items,setItems]=useState<Anime[]>([])
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')

  useEffect(()=>{
    if(!plat){ setLoading(false); return }
    setLoading(true); setErr('')
    fetchAnimeByPlatformSlug(slug, 24).then(setItems).catch(e=> setErr(e instanceof Error? e.message:'載入失敗')).finally(()=> setLoading(false))
  },[slug, plat])

  if(!plat) return <div className="max-w-[1280px] mx-auto px-4 py-10"><h1 className="text-xl font-black">找不到平台</h1><p className="text-sm text-zinc-500 mt-2">支援的平台：{Array.from(PLATFORM_MAP.keys()).join('、')}</p><Link to="/platforms" className="mt-4 inline-block text-sm px-4 py-2 rounded-full bg-violet-600 text-white">回平台一覽</Link></div>

  const title = `${plat.label} 動漫 — ${plat.label} 上架動漫一覽`
  const desc = `${plat.label} 動漫、${plat.label} 上架清單：瀏覽在 ${plat.label} 可觀看的動漫，每部可查看簡介、類型與在哪看的直達連結。`
  const path = `/platform/${slug}`

  return (
    <>
      <Seo
        title={title}
        description={desc}
        path={path}
        jsonLd={[collectionPageJsonLd(title, desc, path), breadcrumbJsonLd([{ name:'首頁', path:'/' },{ name:'觀看平台', path:'/platforms' },{ name: plat.label, path }]), itemListJsonLd(title, items.slice(0,12), '/anime')]}
      />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <nav aria-label="麵包屑" className="text-xs text-zinc-500"><Link to="/" className="underline">首頁</Link> › <Link to="/platforms" className="underline">觀看平台</Link> › {plat.label}</nav>
        <h1 className="mt-3 text-xl font-black flex items-center gap-2"><span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: plat.color, color: plat.fg }}>{plat.label.slice(0,2)}</span>{plat.label} 動漫</h1>
        <p className="mt-1 text-sm text-zinc-500">在 {plat.label} 上架的動漫精選，點卡片進入作品頁與「在哪看」。</p>
        {err && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{err}</div>}
        {loading ? <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_,i)=><div key={i} className="rounded-[14px] border bg-white animate-pulse"><div className="aspect-[3/4] bg-zinc-100" /><div className="h-12 bg-zinc-50" /></div>)}</div> : (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {items.map(a=> <Link key={a.id} to={`/anime/${animeSlug(a)}`}><AnimeCard anime={a} onOpen={()=>{}} /></Link>)}
            </div>
            <div className="mt-6 text-xs text-zinc-500">想找指定作品？試 <Link to={`/search?q=${encodeURIComponent(plat.label)}`} className="underline text-violet-600">搜尋 {plat.label}</Link> 或回 <Link to="/platforms" className="underline text-violet-600">全部平台</Link>。</div>
          </>
        )}
      </div>
    </>
  )
}
