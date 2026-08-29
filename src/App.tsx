import { useEffect, useState, useCallback, useMemo } from 'react'
import { searchAnime, fetchTrendingAnime, type Anime } from './lib/animeApi'
import { AnimeCard, AnimeDetailModal } from './components/AnimeResultItem'
import { rankAnimeByFuzzy } from './lib/fuzzyAnime'

const QUICK_TABS: { id: string; label: string }[] = [
  { id: 'search', label: '搜尋' },
  { id: 'trending', label: '本季新番' },
]
const QUICK_CHIPS = ['葬送的芙莉蓮', '我獨自升級', '咒術迴戰', '間諜家家酒', '藥師少女', '膽大黨']

type RankedAnime = Anime & { _fuzzyScore: number; _matchedField: string }

function DayDivider({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${active ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-zinc-500 border-zinc-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-violet-500'}`} />{label}
    </div>
  )
}

function TrendingGrid({ onOpen }: { onOpen: (a: Anime) => void }) {
  const [items, setItems] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setItems(await fetchTrendingAnime(18)) }
    catch (e) { setErr(e instanceof Error ? e.message : '載入失敗') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-[14px] overflow-hidden border border-zinc-200 bg-white animate-pulse">
            <div className="aspect-[3/4] bg-zinc-100" /><div className="h-[56px] bg-zinc-50" />
          </div>
        ))}
      </div>
    )
  }
  if (err) return <div className="py-8 text-center text-sm text-red-600">{err} <button onClick={load} className="underline text-violet-600 ml-2">重試</button></div>
  if (items.length === 0) return <div className="py-8 text-center text-sm text-zinc-500">暫無資料</div>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {items.map((a, idx) => <AnimeCard key={a.id} anime={a} rank={idx + 1} onOpen={onOpen} />)}
    </div>
  )
}

function SearchResultsGrid({ list, onOpen, query }: { list: RankedAnime[]; onOpen: (a: Anime) => void; query: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {list.map((a) => <AnimeCard key={a.id} anime={a} onOpen={onOpen} query={query} />)}
    </div>
  )
}

export default function App() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'search' | 'trending'>('search')
  const [results, setResults] = useState<RankedAnime[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [detail, setDetail] = useState<RankedAnime | null>(null)
  const [sortBy, setSortBy] = useState<'popular' | 'score'>('popular')
  const [fuzzyEnabled, setFuzzyEnabled] = useState(true)

  const sortedResults = useMemo(() => {
    if (!fuzzyEnabled) {
      const arr = [...results]
      if (sortBy === 'score') arr.sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
      else arr.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      return arr
    }
    const arr = [...results]
    arr.sort((a, b) => {
      const d = (b._fuzzyScore ?? 0) - (a._fuzzyScore ?? 0)
      if (Math.abs(d) > 0.06) return d
      if (sortBy === 'score') return (b.averageScore ?? 0) - (a.averageScore ?? 0)
      return (b.popularity ?? 0) - (a.popularity ?? 0)
    })
    return arr
  }, [results, sortBy, fuzzyEnabled])

  const topIsFuzzy = useMemo(() => {
    if (!searched || sortedResults.length === 0) return false
    const top = sortedResults[0]._fuzzyScore ?? 0
    return top < 0.92 && top >= 0.32
  }, [searched, sortedResults])

  const doSearch = async (override?: string) => {
    const query = (override ?? q).trim()
    if (!query) return
    if (override != null) setQ(override)
    setTab('search')
    setLoading(true); setError(''); setSearched(false)
    try {
      const list = await searchAnime(query)
      const ranked: RankedAnime[] = fuzzyEnabled
        ? rankAnimeByFuzzy(query, list) as RankedAnime[]
        : list.map((a) => ({ ...a, _fuzzyScore: 1, _matchedField: '' }))
      setResults(ranked)
      setSearchedQuery(query)
      setSearched(true)
    } catch (e) { setError(e instanceof Error ? e.message : '查詢失敗') }
    finally { setLoading(false) }
  }
  const clearSearch = () => { setQ(''); setResults([]); setSearched(false); setSearchedQuery(''); setError('') }
  const toggleFuzzy = () => {
    const next = !fuzzyEnabled
    setFuzzyEnabled(next)
    if (searched && searchedQuery) {
      if (next) setResults((prev) => rankAnimeByFuzzy(searchedQuery, prev) as RankedAnime[])
      else setResults((prev) => prev.map((a) => ({ ...a, _fuzzyScore: 1, _matchedField: '' })))
    }
  }

  return (
    <div className="anime-root min-h-screen bg-zinc-50 flex flex-col">
      <div className="shrink-0 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-[1280px] mx-auto h-[48px] px-3 sm:px-4 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center text-sm font-black shadow">A</span>
            <div className="leading-tight">
              <div className="text-[13px] font-extrabold tracking-tight">動畫串流查詢</div>
              <div className="text-[11px] text-zinc-500 -mt-0.5 hidden sm:block">找得到，才看得到</div>
            </div>
          </div>
          <a href="https://github.com/0xseanlee/anime-search" target="_blank" rel="noreferrer" className="ml-auto text-xs px-3 py-1.5 rounded-full bg-zinc-900 text-white hover:bg-black">GitHub</a>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 資料來源：AniList
          </span>
        </div>
      </div>

      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[85%] max-w-[420px] aspect-square bg-white/15 rounded-full blur-[48px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-[95%] max-w-[520px] aspect-square bg-fuchsia-300/20 rounded-full blur-[48px]" />
        <div className="pointer-events-none absolute inset-0 bg-white/10" />
        <div className="relative max-w-[760px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center">
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
              想看什麼動畫？<span className="block sm:inline sm:ml-2 font-extrabold text-white/95">立刻告訴你在哪看</span>
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-sm text-white/85">輸入片名，一鍵查 Crunchyroll / Netflix / 巴哈姆特等上架狀況</p>
          </div>
          <div className="mt-5 bg-white rounded-[18px] sm:rounded-[20px] p-1.5 sm:p-2 shadow-[0_16px_48px_rgba(0,0,0,0.28),0_4px_16px_rgba(0,0,0,0.16)] ring-1 ring-black/5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-white/70 transition-all">
            <div className="flex-1 relative flex items-center">
              <span className="absolute left-3.5 sm:left-4 text-[18px] sm:text-[20px] leading-none text-zinc-400 select-none pointer-events-none">⌕</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
                placeholder="支援模糊搜尋：錯字/簡繁/拼音都找得到，例如：芙利蓮、進擊的巨人"
                autoFocus
                className="w-full h-[46px] sm:h-[50px] pl-10 sm:pl-11 pr-10 bg-zinc-50 border border-zinc-200 rounded-full text-[15px] sm:text-[16px] placeholder:text-zinc-400 text-zinc-900 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
              />
              {q && (
                <button onClick={clearSearch} aria-label="清除" className="absolute right-1.5 w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm hover:bg-black transition-colors">×</button>
              )}
            </div>
            <button onClick={() => doSearch()} disabled={loading || !q.trim()} className="shrink-0 h-[46px] sm:h-[50px] px-6 sm:px-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-[14px] sm:text-[15px] font-extrabold shadow-[0_8px_20px_rgba(124,58,237,0.45)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]">
              {loading ? '查詢中…' : '搜尋'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-white/90">熱門搜尋：</span>
            {QUICK_CHIPS.map((k) => (
              <button key={k} onClick={() => doSearch(k)} className="text-xs sm:text-[13px] font-semibold px-3 sm:px-3.5 py-1.5 rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-black/5 hover:bg-zinc-50 hover:scale-[1.02] active:scale-[0.98] transition-all">{k}</button>
            ))}
          </div>
          <div className="mt-2.5 text-center text-[11px] text-white/70">已開啟模糊搜尋 · 支援中文／日文／英文片名 · 錯字、簡繁、縮寫都能命中 · 按 Enter 直接搜尋</div>
        </div>
      </div>

      <div className="shrink-0 bg-white border-b border-zinc-200 px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2 max-w-[1280px] mx-auto w-full">
        <div className="flex items-center rounded-full bg-zinc-100 p-1 gap-1">
          {QUICK_TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id as any); if (t.id === 'trending') clearSearch() }} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${tab === t.id ? 'bg-white shadow border border-zinc-200 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}>{t.label}</button>
          ))}
        </div>
        <button onClick={toggleFuzzy} title={fuzzyEnabled ? '已開啟：錯字/簡繁都能命中，點此切為精準' : '已關閉：僅精準子字串，點此開啟模糊'} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${fuzzyEnabled ? 'bg-amber-400 text-amber-900 border-amber-300 shadow' : 'bg-white text-zinc-500 border-zinc-200 hover:border-amber-200'}`}>
          <span className={`w-2 h-2 rounded-full ${fuzzyEnabled ? 'bg-amber-900 animate-pulse' : 'bg-zinc-400'}`} />{fuzzyEnabled ? '模糊搜尋：開' : '模糊搜尋：關'}
        </button>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[11px] text-zinc-500">{searched ? `搜尋結果 ${sortedResults.length} 部${topIsFuzzy ? ' · 已依相似度重排' : ''}` : '本季新番週期表'}</span>
      </div>

      <div className="flex-1">
        <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-extrabold tracking-tight flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />{tab === 'trending' || !searched ? '本季新番' : `搜尋「${searchedQuery}」`}
                <span className="text-xs font-medium text-zinc-500">週期表</span>
              </h2>
              {searched && !loading && sortedResults.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600 text-white font-bold">{sortedResults.length} 部</span>}
              {topIsFuzzy && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-bold border border-amber-300">已依相似度重排</span>}
            </div>
            <div className="flex items-center gap-2">
              {searched && sortedResults.length > 1 && (
                <div className="flex items-center gap-1 rounded-full bg-white border border-zinc-200 p-1">
                  <button onClick={() => setSortBy('popular')} className={`text-xs px-3 py-1 rounded-full font-medium ${sortBy === 'popular' ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>人氣</button>
                  <button onClick={() => setSortBy('score')} className={`text-xs px-3 py-1 rounded-full font-medium ${sortBy === 'score' ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>評分</button>
                </div>
              )}
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500">依相關度與 {sortBy === 'score' ? '評分' : '人氣'} 排列 <span className="text-[10px]">↕</span></span>
            </div>
          </div>

          {topIsFuzzy && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 flex gap-2.5 items-start">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-amber-400 text-amber-900 flex items-center justify-center text-xs font-black">≈</span>
              <div className="text-xs leading-relaxed"><span className="font-bold">未找到完全相符，幫你列出最接近的結果</span><span className="text-zinc-500"> · 支援錯字、簡繁、羅馬字/英文別名。關掉「模糊搜尋」可只看精準命中。</span></div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <DayDivider label="本週熱門" active={tab === 'trending' && !searched} />
            <div className="h-4 w-px bg-zinc-200 mx-1" />
            {['週一','週二','週三','週四','週五','週六','週日'].map((d) => (
              <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-zinc-500 whitespace-nowrap">{d}</span>
            ))}
          </div>

          {!searched && !loading && !error && (
            <div className="mb-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50/60 px-3.5 py-3 flex gap-3 items-start">
              <span className="w-8 h-8 rounded-xl bg-white border border-violet-100 flex items-center justify-center text-sm shadow-sm shrink-0">💡</span>
              <div className="text-xs leading-relaxed text-zinc-500"><span className="font-bold text-zinc-900">模糊搜尋已啟用</span> — 就算打錯字、打簡寫也能找到。例：打 <span className="font-mono bg-white border border-zinc-200 rounded px-1">芙利蓮</span> 也能找到《葬送的芙莉蓮》，打 <span className="font-mono bg-white border border-zinc-200 rounded px-1">spy family</span> / <span className="font-mono bg-white border border-zinc-200 rounded px-1">間諜家家酒</span> 互通。點卡片可看詳細資訊與直達連結。</div>
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">{error}</div>}
          {loading && (
            <div className="py-10 flex flex-col items-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
              <span className="text-sm text-zinc-500">查詢中…（含模糊重排）</span>
            </div>
          )}
          {!loading && !error && searched && sortedResults.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-xl">🔍</div>
              <div className="text-sm font-semibold mt-3">找不到符合「{searchedQuery}」的動漫</div>
              <div className="text-xs text-zinc-500 mt-1">已嘗試模糊匹配，試試更短的關鍵字、或用日文／英文原名</div>
              <button onClick={clearSearch} className="mt-4 text-xs px-3 py-1.5 rounded-full bg-white border border-zinc-200 hover:border-violet-300">清除搜尋</button>
            </div>
          )}

          {!loading && !error && searched && sortedResults.length > 0 && (
            <SearchResultsGrid list={sortedResults} onOpen={(a) => setDetail(a as RankedAnime)} query={searchedQuery} />
          )}
          {!loading && !error && !searched && (
            <TrendingGrid onOpen={(a) => setDetail(a as unknown as RankedAnime)} />
          )}

          <div className="mt-6 flex items-center justify-center">
            <span className="text-[11px] text-zinc-500 bg-white border border-zinc-200 rounded-full px-3 py-1.5">模糊搜尋：錯字/簡繁/別名皆可命中 · 點卡片查看可觀看平台與直達連結 · 資料由 AniList 提供</span>
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
        <a href="https://github.com/0xseanlee/anime-search" target="_blank" rel="noreferrer" className="hover:text-violet-600">GitHub: 0xseanlee/anime-search</a>
        <span className="mx-2">·</span>AniList API · GitHub Pages 部署
      </footer>

      {detail && <AnimeDetailModal anime={detail} onClose={() => setDetail(null)} query={searchedQuery} />}
    </div>
  )
}
