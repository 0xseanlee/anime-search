import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchTrendingAnime, type Anime } from '../lib/animeApi'
import { AnimeCard, AnimeDetailModal } from '../components/AnimeResultItem'
import { rankAnimeByFuzzy } from '../lib/fuzzyAnime'
import { searchAnime } from '../lib/animeApi'
import { Seo } from '../seo/Seo'
import { SITE } from '../seo/site'
import { PLATFORMS } from '../seo/platforms'
import { animeSlug } from '../seo/slug'
import { collectionPageJsonLd, itemListJsonLd } from '../seo/schema'

type RankedAnime = Anime & { _fuzzyScore: number; _matchedField: string }

function TrendingGrid({ onOpen }: { onOpen: (a: Anime) => void }) {
  const [items, setItems] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setItems(await fetchTrendingAnime(18)) } catch (e) { setErr(e instanceof Error ? e.message : '載入失敗') } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-[14px] border border-zinc-200 bg-white animate-pulse"><div className="aspect-[3/4] bg-zinc-100" /><div className="h-[56px] bg-zinc-50" /></div>)}</div>
  if (err) return <div className="py-8 text-center text-sm text-red-600">{err} <button onClick={load} className="underline text-violet-600 ml-2">重試</button></div>
  if (items.length === 0) return <div className="py-8 text-center text-sm text-zinc-500">暫無資料</div>
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{items.map((a, i) => <AnimeCard key={a.id} anime={a} rank={i+1} onOpen={onOpen} />)}</div>
}

export default function HomePage() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<RankedAnime[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [detail, setDetail] = useState<RankedAnime | null>(null)
  const [fuzzyEnabled, setFuzzyEnabled] = useState(true)

  const doSearch = async (override?: string) => {
    const query = (override ?? q).trim()
    if (!query) return
    nav(`/search?q=${encodeURIComponent(query)}`)
  }

  // 首頁也支援直接搜尋（不跳轉）保留舊互動，若要 SEO 則導向 /search
  const doInlineSearch = async (override?: string) => {
    const query = (override ?? q).trim()
    if (!query) return
    if (override) setQ(override)
    setLoading(true); setError(''); setSearched(false)
    try {
      const list = await searchAnime(query)
      const ranked = fuzzyEnabled ? rankAnimeByFuzzy(query, list) as RankedAnime[] : list.map(a=>({ ...a, _fuzzyScore: 1, _matchedField: '' }))
      setResults(ranked); setSearchedQuery(query); setSearched(true)
    } catch(e){ setError(e instanceof Error? e.message:'查詢失敗') } finally{ setLoading(false) }
  }

  const trendingForLd = useMemo(()=>[],[])

  return (
    <>
      <Seo
        title="動漫搜尋 — 動畫搜尋、在哪看、觀看平台一次查"
        description="動漫查詢與動漫搜尋首頁：輸入片名一鍵查在哪看。支援 Netflix / Disney+ / Crunchyroll / 巴哈姆特動畫瘋等觀看平台上架查詢、2026 新番、類型與長尾關鍵字索引。"
        path="/"
        jsonLd={[
          collectionPageJsonLd('動漫搜尋', SITE.description, '/'),
          itemListJsonLd('本季新番', trendingForLd as any, '/anime'),
        ]}
      />
      {/* Hero — H1 為核心關鍵字 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[85%] max-w-[420px] aspect-square bg-white/15 rounded-full blur-[48px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-[95%] max-w-[520px] aspect-square bg-fuchsia-300/20 rounded-full blur-[48px]" />
        <div className="relative max-w-[760px] mx-auto px-4 sm:px-6 py-8">
          <div className="text-center">
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
              動漫搜尋 — 想看什麼動畫？<span className="block sm:inline sm:ml-2 font-extrabold text-white/95">立刻告訴你在哪看</span>
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-sm text-white/85">動漫查詢 / 動畫搜尋 / 動漫觀看平台 / XX 動漫在哪看 — 一鍵查 Crunchyroll / Netflix / 巴哈姆特</p>
          </div>
          <form onSubmit={(e)=>{ e.preventDefault(); doSearch() }} className="mt-5 bg-white rounded-[18px] sm:rounded-[20px] p-1.5 sm:p-2 shadow-[0_16px_48px_rgba(0,0,0,0.28)] ring-1 ring-black/5 flex items-center gap-2" role="search" aria-label="動漫搜尋">
            <label htmlFor="home-q" className="sr-only">動漫查詢</label>
            <div className="flex-1 relative flex items-center">
              <span className="absolute left-3.5 sm:left-4 text-[18px] leading-none text-zinc-400 select-none pointer-events-none">⌕</span>
              <input id="home-q" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="搜尋動漫：例 鬼滅之刃、葬送的芙莉蓮、進擊的巨人" className="w-full h-[46px] sm:h-[50px] pl-10 pr-10 bg-zinc-50 border border-zinc-200 rounded-full text-[15px] placeholder:text-zinc-400 text-zinc-900 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 outline-none" />
            </div>
            <button type="submit" className="shrink-0 h-[46px] sm:h-[50px] px-6 sm:px-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[14px] font-extrabold shadow-[0_8px_20px_rgba(124,58,237,0.45)]">搜尋</button>
          </form>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-white/90">熱門搜尋：</span>
            {['葬送的芙莉蓮','我獨自升級','咒術迴戰','間諜家家酒','藥師少女','膽大黨'].map(k=> <button key={k} onClick={()=>doInlineSearch(k)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-zinc-800 shadow hover:bg-zinc-50">{k}</button>)}
          </div>
          <p className="mt-2 text-[11px] text-white/70">支援模糊搜尋 · 中文／日文／英文片名 · 錯字、簡繁、縮寫都能命中</p>
        </div>
      </div>

      {/* 平台入口 — internal linking */}
      <section className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-4" aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" className="text-sm font-extrabold flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />動漫觀看平台</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLATFORMS.map(p=> <Link key={p.slug} to={`/platform/${p.slug}`} className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-white hover:border-violet-300 hover:text-violet-600">{p.label}</Link>)}
          <Link to="/platforms" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-900 text-white">全部平台 ›</Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link to="/season/2026/summer" className="px-3 py-1.5 rounded-full border bg-white hover:border-violet-300">2026 夏季新番</Link>
          <Link to="/season/2026/spring" className="px-3 py-1.5 rounded-full border bg-white hover:border-violet-300">2026 春季新番</Link>
          <Link to="/genres/Action" className="px-3 py-1.5 rounded-full border bg-white hover:border-violet-300">類型：Action</Link>
          <Link to="/genres/Fantasy" className="px-3 py-1.5 rounded-full border bg-white hover:border-violet-300">類型：Fantasy</Link>
          <Link to="/anime" className="px-3 py-1.5 rounded-full bg-violet-600 text-white">瀏覽動漫資料庫 →</Link>
        </div>
      </section>

      {/* 本季新番  + 若有 inline 搜尋結果 */}
      <section className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 pb-6" aria-labelledby="trending-heading">
        <h2 id="trending-heading" className="text-[15px] font-extrabold tracking-tight flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />{searched? `搜尋「${searchedQuery}」`:'本季新番'} <span className="text-xs font-medium text-zinc-500">週期表</span></h2>
        {!searched && !loading && !error && <p className="mt-2 text-xs text-zinc-500">下方為 TRENDING 動漫，點卡片查看「在哪看」與串流直達連結，亦可前往 <Link to="/anime" className="underline text-violet-600">動漫資料庫</Link> 或用上方 <Link to="/search" className="underline text-violet-600">搜尋</Link> 找指定作品。</p>}
        <div className="mt-4">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{error}</div>}
          {loading && <div className="py-10 flex flex-col items-center gap-3"><span className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" /><span className="text-sm text-zinc-500">查詢中…</span></div>}
          {!loading && searched && results.length===0 && <div className="py-8 text-center text-sm">找不到符合「{searchedQuery}」的動漫 — 試試 <Link to={`/search?q=${encodeURIComponent(searchedQuery)}`} className="underline text-violet-600">完整搜尋頁</Link></div>}
          {!loading && searched && results.length>0 && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">{results.map(a=> <AnimeCard key={a.id} anime={a} onOpen={(anime)=> setDetail(anime as RankedAnime)} />)}</div>}
          {!loading && !searched && <TrendingGrid onOpen={(a)=>setDetail(a as any)} />}
        </div>
        {/* 為爬蟲可見的連結清單（首屏外但在 HTML 中） */}
        <nav aria-label="熱門動漫連結" className="mt-6 border-t border-zinc-200 pt-4">
          <h3 className="text-xs font-bold text-zinc-700">熱門動漫 — 直接開啟 SEO 頁面</h3>
          <p className="mt-2 text-xs text-zinc-500">每個作品都有獨立的 <code>/anime/:slug</code> 與 <code>/where-to-watch/:slug</code> 頁面，利於長尾「XX 動漫在哪看」排名。</p>
        </nav>
      </section>

      {detail && <AnimeDetailModal anime={detail} onClose={()=>setDetail(null)} query={searchedQuery} />}
      {/* 額外：示範 trending 的 Link 清單供爬蟲發現（SSR 友善） */}
      <section className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 pb-8 text-xs">
        <h2 className="font-bold">探索更多</h2>
        <ul className="mt-2 grid sm:grid-cols-2 gap-1 list-disc pl-5 text-zinc-600">
          <li><Link to="/anime" className="underline hover:text-violet-600">動漫資料庫 — 依人氣瀏覽全部作品</Link></li>
          <li><Link to="/platforms" className="underline hover:text-violet-600">動漫上架平台 / 觀看平台 一覽</Link></li>
          <li><Link to="/season/2026/summer" className="underline hover:text-violet-600">2026 夏季新番</Link> · <Link to="/season/2026/spring" className="underline hover:text-violet-600">2026 春季</Link></li>
          <li>類型：{['Action','Fantasy','Romance','Comedy'].map(g=> <Link key={g} to={`/genres/${g}`} className="underline hover:text-violet-600 mr-2">{g}</Link>)}</li>
        </ul>
      </section>
    </>
  )
}
