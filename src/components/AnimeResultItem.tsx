import { useState } from 'react'
import type { Anime } from '../lib/animeApi'
import { highlightSegments } from '../lib/fuzzySearch'

const STREAM_KEYWORDS = [
  'crunchyroll', 'netflix', 'hulu', 'prime video', 'amazon', 'hidive', 'bilibili',
  'disney', 'hbo', 'tubi', 'aniplus', 'adn', 'muse', 'iqiyi', 'bahamut', 'gamer', 'ani.gamer', 'kktv', 'funimation', 'animax',
]

function isBahamutUrl(url: string): boolean {
  const u = (url ?? '').toLowerCase()
  return u.includes('ani.gamer.com.tw') || u.includes('gamer.com.tw')
}
function isStreamingLink(link: { site: string; url: string }): boolean {
  const s = (link.site ?? '').toLowerCase()
  const u = (link.url ?? '').toLowerCase()
  if (isBahamutUrl(u)) return true
  return STREAM_KEYWORDS.some((k) => s.includes(k) || u.includes(k))
}
function streamLinks(anime: Anime) { return anime.externalLinks.filter(isStreamingLink) }
function otherLinks(anime: Anime) { return anime.externalLinks.filter((l) => !isStreamingLink(l)) }
function bahamutSearchUrlForAnime(anime: Anime): string {
  const raw = anime.title?.native || anime.title?.romaji || anime.title?.english || ''
  const q = encodeURIComponent(raw.trim() || '動畫')
  return `https://ani.gamer.com.tw/search.php?keyword=${q}`
}
function platformBrand(site: string, url?: string): { label: string; bg: string; fg: string } {
  const s = site.toLowerCase()
  const u = (url ?? '').toLowerCase()
  const isBaha = s.includes('bahamut') || s.includes('gamer') || isBahamutUrl(u)
  if (isBaha) return { label: '巴哈姆特', bg: 'var(--stream-bahamut)', fg: 'var(--stream-bahamut-fg)' }
  if (s.includes('crunchyroll') || u.includes('crunchyroll')) return { label: 'Crunchyroll', bg: 'var(--stream-crunchyroll)', fg: 'var(--stream-crunchyroll-fg)' }
  if (s.includes('netflix') || u.includes('netflix')) return { label: 'Netflix', bg: 'var(--stream-netflix)', fg: 'var(--stream-netflix-fg)' }
  if (s.includes('disney') || u.includes('disney')) return { label: 'Disney+', bg: 'var(--stream-disney)', fg: 'var(--stream-disney-fg)' }
  if (s.includes('prime') || s.includes('amazon') || u.includes('primevideo') || u.includes('amazon')) return { label: 'Prime Video', bg: 'var(--stream-prime)', fg: 'var(--stream-prime-fg)' }
  if (s.includes('bilibili') || u.includes('bilibili')) return { label: 'Bilibili', bg: 'var(--stream-bilibili)', fg: 'var(--stream-bilibili-fg)' }
  if (s.includes('hulu') || u.includes('hulu')) return { label: 'Hulu', bg: 'var(--stream-hulu)', fg: 'var(--stream-hulu-fg)' }
  if (s.includes('hidive') || u.includes('hidive')) return { label: 'HIDIVE', bg: 'var(--stream-hidive)', fg: 'var(--stream-hidive-fg)' }
  if (s.includes('muse') || u.includes('muse')) return { label: 'Muse', bg: 'var(--stream-muse)', fg: 'var(--stream-muse-fg)' }
  if (s.includes('iqiyi') || u.includes('iqiyi') || u.includes('iq.com')) return { label: '愛奇藝', bg: 'var(--stream-iqiyi)', fg: 'var(--stream-iqiyi-fg)' }
  return { label: site, bg: 'var(--stream-default)', fg: 'var(--stream-default-fg)' }
}
function formatLabel(fmt?: string): string {
  const m: Record<string, string> = { TV: 'TV', MOVIE: '劇場版', OVA: 'OVA', ONA: 'ONA', SPECIAL: '特別篇', MUSIC: '音樂' }
  return fmt ? (m[fmt] ?? fmt) : ''
}
function statusLabel(s?: string): string {
  const m: Record<string, string> = { FINISHED: '已完結', RELEASING: '連載中', NOT_YET_RELEASED: '未開播', CANCELLED: '已取消', HIATUS: '休載中' }
  return s ? (m[s] ?? s) : ''
}

function HighlightedTitle({ title, query, className }: { title: string; query?: string; className?: string }) {
  if (!query || !query.trim() || !title) return <span className={className}>{title}</span>
  const segs = highlightSegments(query, title)
  const hasHit = segs.some((s) => s.matched)
  if (!hasHit) return <span className={className}>{title}</span>
  return (
    <span className={className}>
      {segs.map((s, i) => (
        <span key={i} className={s.matched ? 'bg-amber-200 rounded-[2px] px-0.5' : ''}>{s.text}</span>
      ))}
    </span>
  )
}

function PlatformDots({ links }: { links: { site: string; url: string }[] }) {
  if (links.length === 0) return <span className="text-[11px] text-zinc-400 italic">暫無串流</span>
  const shown = links.slice(0, 4)
  return (
    <div className="flex items-center gap-1">
      {shown.map((l, i) => {
        const b = platformBrand(l.site, l.url)
        return (
          <a key={i} href={l.url} target="_blank" rel="noreferrer" title={b.label}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black leading-none shadow-sm ring-1 ring-black/10 hover:scale-110 transition-transform"
            style={{ background: b.bg, color: b.fg }}>
            {b.label.slice(0, 2)}
          </a>
        )
      })}
      {links.length > 4 && <span className="text-[10px] text-zinc-500">+{links.length - 4}</span>}
    </div>
  )
}

export function AnimeCard({ anime, rank, onOpen, query }: { anime: Anime & { _fuzzyScore?: number; _matchedField?: string }; rank?: number; onOpen: (a: Anime) => void; query?: string }) {
  const title = anime.title?.romaji || anime.title?.english || anime.title?.native || '—'
  const nativeTitle = anime.title?.native && anime.title.native !== title ? anime.title.native : ''
  const sLinks = streamLinks(anime)
  const score = anime.averageScore
  const epLabel = anime.episodes ? `全${anime.episodes}話` : anime.status ? statusLabel(anime.status) : ''
  const isFuzzy = anime._fuzzyScore != null && anime._fuzzyScore < 0.92 && anime._fuzzyScore >= 0.32

  return (
    <button onClick={() => onOpen(anime)}
      className="group text-left rounded-[14px] overflow-hidden bg-white border border-zinc-200 shadow-sm hover:shadow-lg hover:border-violet-200 hover:-translate-y-[2px] transition-all duration-200 flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
        {anime.coverImage ? (
          <img src={anime.coverImage} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-100 via-indigo-100 to-fuchsia-100 flex items-center justify-center"><span className="text-2xl opacity-20">🎬</span></div>
        )}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1">
            {rank != null && (
              <span className={`min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-[11px] font-black shadow-md backdrop-blur-md ${rank <= 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-black/65 text-white border border-white/20'}`}>{rank}</span>
            )}
            {anime.format && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/55 text-white backdrop-blur border border-white/15">{formatLabel(anime.format)}</span>}
          </div>
          <span className="w-7 h-7 rounded-full bg-black/35 backdrop-blur border border-white/15 flex items-center justify-center text-white/90 group-hover:bg-white group-hover:text-rose-500 transition-colors">
            <span className="text-[13px] leading-none">♡</span>
          </span>
        </div>
        {score != null && (
          <span className={`absolute top-1.5 right-10 text-[11px] font-black px-1.5 py-0.5 rounded-full shadow-md border ${score >= 85 ? 'bg-emerald-500 text-white border-emerald-400' : score >= 72 ? 'bg-amber-500 text-white border-amber-400' : 'bg-zinc-900/80 text-white border-white/15 backdrop-blur'}`}>{score}</span>
        )}
        {isFuzzy && query && (
          <span className="absolute top-10 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 shadow border border-amber-300">模糊匹配</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90 group-hover:from-black/80 transition-colors" />
        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
          <div className="flex items-center gap-1.5 text-[11px] text-white/90 mb-1">
            {epLabel && <span className="px-1.5 py-0.5 rounded-full bg-white/15 backdrop-blur border border-white/15">▶ {epLabel}</span>}
            {anime.popularity != null && anime.popularity > 0 && <span className="flex items-center gap-1 text-white/75">◎ {anime.popularity > 1000 ? `${(anime.popularity / 1000).toFixed(1)}k` : anime.popularity}</span>}
            {anime.duration && <span className="ml-auto text-white/70">{anime.duration}分</span>}
          </div>
          <div className="text-[13px] font-bold leading-tight line-clamp-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
            <HighlightedTitle title={title} query={query} />
          </div>
          {nativeTitle && <div className="text-[11px] text-white/65 truncate"><HighlightedTitle title={nativeTitle} query={query} /></div>}
          {isFuzzy && anime._matchedField && <div className="text-[10px] text-white/60 mt-0.5">命中：{anime._matchedField}</div>}
        </div>
      </div>
      <div className="px-2.5 py-2 flex items-center justify-between gap-2 bg-white">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-zinc-500 truncate">{(anime.genres ?? []).slice(0, 2).join(' · ') || anime.studios?.[0] || '—'}</div>
          <div className="text-[11px] text-zinc-400">{[anime.seasonYear, anime.season ? ({ WINTER: '冬', SPRING: '春', SUMMER: '夏', FALL: '秋' } as any)[anime.season] ?? anime.season : ''].filter(Boolean).join(' ') || ' '}</div>
        </div>
        <PlatformDots links={sLinks} />
      </div>
    </button>
  )
}

export function AnimeResultItem({ anime }: { anime: Anime }) {
  const [open, setOpen] = useState(false)
  return (<><AnimeCard anime={anime} onOpen={() => setOpen(true)} />{open && <AnimeDetailModal anime={anime} onClose={() => setOpen(false)} />}</>)
}

export function AnimeDetailModal({ anime, onClose, query }: { anime: Anime & { _fuzzyScore?: number; _matchedField?: string }; onClose: () => void; query?: string }) {
  const title = anime.title?.romaji || anime.title?.english || anime.title?.native || '—'
  const nativeTitle = anime.title?.native && anime.title.native !== title ? anime.title.native : ''
  const sLinks = streamLinks(anime)
  const oLinks = otherLinks(anime)
  const hasBahamut = sLinks.some((l) => isBahamutUrl(l.url))
  const bahamutSearchUrl = bahamutSearchUrlForAnime(anime)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full sm:max-w-[720px] max-h-[92vh] sm:max-h-[86vh] bg-white rounded-t-[20px] sm:rounded-[20px] shadow-2xl overflow-hidden flex flex-col border border-zinc-200">
        <div className="relative h-[168px] sm:h-[200px] shrink-0 overflow-hidden bg-zinc-100">
          {anime.bannerImage ? <img src={anime.bannerImage} alt="" className="w-full h-full object-cover" />
            : anime.coverImage ? <img src={anime.coverImage} alt="" className="w-full h-full object-cover blur-[1px] scale-105 opacity-70" />
              : <div className="w-full h-full bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600" />}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 backdrop-blur text-white border border-white/15 flex items-center justify-center hover:bg-black/60">✕</button>
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex gap-4 items-end">
            <img src={anime.coverImage} alt={title} className="w-[92px] h-[128px] rounded-xl object-cover shadow-xl ring-1 ring-black/10 hidden sm:block" />
            <div className="min-w-0 flex-1 pb-1">
              <div className="text-[18px] sm:text-[20px] font-extrabold leading-tight line-clamp-2">
                <HighlightedTitle title={title} query={query} />
              </div>
              {nativeTitle && <div className="text-sm text-zinc-500 truncate"><HighlightedTitle title={nativeTitle} query={query} /></div>}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {anime.format && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600 text-white">{formatLabel(anime.format)}</span>}
                {anime.episodes && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200">{anime.episodes} 集</span>}
                {anime.seasonYear && <span className="text-xs text-zinc-500">· {anime.seasonYear} {anime.season ?? ''}</span>}
                {anime.averageScore != null && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white ml-1">{anime.averageScore} 分</span>}
                {anime._fuzzyScore != null && query && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${anime._fuzzyScore >= 0.92 ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-900'}`}>{anime._fuzzyScore >= 0.92 ? '精準' : '模糊'} {(anime._fuzzyScore * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-5 py-4 space-y-4">
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {anime.genres.map((g) => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600">{g}</span>)}
                {anime.studios?.map((s) => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">▸ {s}</span>)}
              </div>
            )}
            {anime.description && <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{anime.description}</p>}
            <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                <h3 className="text-sm font-bold">可在以下平台觀看</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">{sLinks.length || 0} 個平台</span>
                {!hasBahamut && <span className="text-[11px] text-zinc-500">· 另提供巴哈姆特搜尋</span>}
              </div>
              {sLinks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sLinks.map((l, i) => {
                    const b = platformBrand(l.site, l.url)
                    return (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white hover:shadow-md hover:border-violet-200 transition-all">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: b.bg, color: b.fg }}>{b.label.slice(0, 2)}</span>
                        <span className="text-sm font-semibold flex-1 truncate group-hover:text-violet-600">{b.label}</span>
                        <span className="text-xs text-zinc-500 group-hover:text-violet-600">前往 ›</span>
                      </a>
                    )
                  })}
                  {!hasBahamut && (
                    <a href={bahamutSearchUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white hover:shadow-md hover:border-violet-200 transition-all border-dashed">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'var(--stream-bahamut)', color: 'var(--stream-bahamut-fg)' }}>巴哈</span>
                      <span className="text-sm font-semibold flex-1 truncate group-hover:text-violet-600">巴哈姆特動畫瘋（搜尋）</span>
                      <span className="text-xs text-zinc-500 group-hover:text-violet-600">搜尋 ›</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-zinc-500 bg-white border border-dashed border-zinc-200 rounded-xl px-3 py-4 text-center">
                    <div className="text-lg mb-1">📡</div>AniList 暫未收錄此作品的串流連結<br /><span className="text-xs">可直接到巴哈姆特動畫瘋搜尋，或試日文／英文原名再搜一次</span>
                  </div>
                  <a href={bahamutSearchUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white hover:shadow-md hover:border-violet-200 transition-all">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'var(--stream-bahamut)', color: 'var(--stream-bahamut-fg)' }}>巴哈</span>
                    <span className="text-sm font-semibold flex-1">到巴哈姆特動畫瘋搜尋「{anime.title?.native || anime.title?.romaji || '此作品'}」</span>
                    <span className="text-xs text-zinc-500">搜尋 ›</span>
                  </a>
                </div>
              )}
              <p className="text-[11px] text-zinc-500 mt-2.5 leading-relaxed">依 AniList externalLinks 判斷上架（site 或網址含 bahamut / gamer / ani.gamer 即視為巴哈姆特）。巴哈「搜尋」為輔助入口，最終以站內授權為準。</p>
            </div>
            {oLinks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 mb-2">官方／資料連結</h4>
                <div className="flex flex-wrap gap-1.5">
                  {oLinks.slice(0, 10).map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-full bg-white border border-zinc-200 hover:border-violet-300 hover:text-violet-600 transition-colors">{l.site}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
