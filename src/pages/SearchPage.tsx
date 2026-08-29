import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchAnime, type Anime } from '../lib/animeApi'
import { rankAnimeByFuzzy } from '../lib/fuzzyAnime'
import { AnimeCard, AnimeDetailModal } from '../components/AnimeResultItem'
import { Seo } from '../seo/Seo'
import { animeSlug } from '../seo/slug'
import { breadcrumbJsonLd, collectionPageJsonLd } from '../seo/schema'

type Ranked = Anime & { _fuzzyScore: number; _matchedField: string }

export default function SearchPage() {
  const [sp, setSp] = useSearchParams()
  const q = (sp.get('q') ?? '').trim()
  const [input, setInput] = useState(q)
  const [results, setResults] = useState<Ranked[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Ranked | null>(null)

  useEffect(()=> setInput(q), [q])

  useEffect(()=>{
    if(!q){ setResults([]); setError(''); return }
    let cancelled = false
    setLoading(true); setError('')
    searchAnime(q).then(list=>{
      if(cancelled) return
      const ranked = rankAnimeByFuzzy(q, list) as Ranked[]
      setResults(ranked)
    }).catch(e=>{ if(!cancelled) setError(e instanceof Error? e.message: '查詢失敗') })
      .finally(()=>{ if(!cancelled) setLoading(false) })
    return ()=>{ cancelled = true }
  },[q])

  const title = q ? `「${q}」動漫搜尋結果` : '動漫搜尋'
  const desc = q ? `搜尋「${q}」的動漫結果，含簡介、類型、年份與可在 Netflix / Crunchyroll / 巴哈姆特等觀看平台的「在哪看」連結。` : '輸入動漫名稱搜尋，支援模糊／中日英互通，立即查在哪看與上架平台。'

  return (
    <>
      <Seo
        title={title}
        description={desc}
        path={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
        noindex={!q}
        jsonLd={[collectionPageJsonLd(title, desc, q ? `/search?q=${encodeURIComponent(q)}` : '/search'), breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '搜尋', path: '/search' }])]}
      />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <h1 className="text-xl font-black tracking-tight">{q ? `搜尋：${q}` : '動漫搜尋'}</h1>
        <p className="mt-1 text-sm text-zinc-500">動漫查詢 / 動畫搜尋 — 輸入片名查詢「在哪看」與上架平台。</p>

        <form onSubmit={(e)=>{ e.preventDefault(); const v=input.trim(); setSp(v? { q: v }: {}) }} className="mt-4 flex gap-2 max-w-[560px]" role="search">
          <label htmlFor="q" className="sr-only">搜尋關鍵字</label>
          <input id="q" value={input} onChange={e=>setInput(e.target.value)} placeholder="例如：鬼滅之刃、芙莉蓮、進擊的巨人" className="flex-1 h-10 px-4 bg-white border border-zinc-200 rounded-full text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none" />
          <button type="submit" className="h-10 px-6 rounded-full bg-violet-600 text-white text-sm font-bold">搜尋</button>
        </form>

        {!q && (
          <div className="mt-6 text-sm text-zinc-600">
            <h2 className="font-bold">熱門搜尋</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {['葬送的芙莉蓮','我獨自升級','咒術迴戰','間諜家家酒','鬼滅之刃','進擊的巨人'].map(k=> <Link key={k} to={`/search?q=${encodeURIComponent(k)}`} className="px-3 py-1.5 rounded-full border bg-white hover:border-violet-300 text-xs">{k}</Link>)}
            </div>
            <p className="mt-4 text-xs">也試試 <Link to="/anime" className="underline text-violet-600">動漫資料庫</Link> 或 <Link to="/platforms" className="underline text-violet-600">依平台瀏覽</Link>。</p>
          </div>
        )}

        {q && (
          <section className="mt-6" aria-labelledby="results-heading">
            <h2 id="results-heading" className="text-sm font-bold">搜尋結果 {results.length>0 && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-600 text-white">{results.length} 部</span>}</h2>
            {loading && <div className="py-8 text-center text-sm text-zinc-500">查詢中…</div>}
            {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{error}</div>}
            {!loading && !error && results.length===0 && <div className="py-8 text-center text-sm text-zinc-500">沒有找到符合「{q}」的結果，試試更短關鍵字或 <Link to="/anime" className="underline text-violet-600">瀏覽全部</Link>。</div>}
            {!loading && results.length>0 && (
              <>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {results.map(a=> <AnimeCard key={a.id} anime={a} onOpen={(anime)=> setDetail(anime as Ranked)} query={q} />)}
                </div>
                <nav aria-label="結果內部連結" className="mt-6 border-t pt-4 text-xs">
                  <h3 className="font-bold">查看詳細頁面（利於「XX 在哪看」長尾）</h3>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-1">
                    {results.slice(0,12).map(a=> (
                      <li key={a.id}><Link to={`/anime/${animeSlug(a)}`} className="underline hover:text-violet-600">{a.title?.native || a.title?.english || a.title?.romaji}</Link> · <Link to={`/where-to-watch/${animeSlug(a)}`} className="underline hover:text-violet-600">在哪看</Link></li>
                    ))}
                  </ul>
                </nav>
              </>
            )}
          </section>
        )}
      </div>
      {detail && <AnimeDetailModal anime={detail} onClose={()=>setDetail(null)} query={q} />}
    </>
  )
}
