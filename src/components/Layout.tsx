import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

export function TopNav() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-200">
      <div className="max-w-[1280px] mx-auto h-[52px] px-3 sm:px-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center text-sm font-black shadow">A</span>
          <span className="leading-tight hidden sm:block">
            <span className="block text-[13px] font-extrabold tracking-tight">動漫搜尋</span>
            <span className="block text-[11px] text-zinc-500 -mt-0.5">找得到，才看得到</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="主導航">
          <NavLink to="/anime" className={({ isActive }) => `text-xs font-semibold px-3 py-1.5 rounded-full ${isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>動漫資料庫</NavLink>
          <NavLink to="/platforms" className={({ isActive }) => `text-xs font-semibold px-3 py-1.5 rounded-full ${isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>觀看平台</NavLink>
          <NavLink to="/season/2026/summer" className={({ isActive }) => `text-xs font-semibold px-3 py-1.5 rounded-full ${isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>2026 夏季新番</NavLink>
        </nav>
        <form
          onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (!v) return; nav(`/search?q=${encodeURIComponent(v)}`) }}
          className="ml-auto flex items-center gap-2"
          role="search"
        >
          <label className="sr-only" htmlFor="top-search">搜尋動漫</label>
          <input
            id="top-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋動漫…"
            className="w-[160px] sm:w-[260px] h-8 px-3 bg-zinc-50 border border-zinc-200 rounded-full text-sm placeholder:text-zinc-400 focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none"
          />
          <button type="submit" className="h-8 px-4 rounded-full bg-violet-600 text-white text-xs font-bold hover:bg-violet-700">搜尋</button>
        </form>
      </div>
      {loc.pathname !== '/' && (
        <div className="max-w-[1280px] mx-auto px-3 sm:px-4 pb-2 flex items-center gap-1.5 overflow-x-auto text-xs text-zinc-500">
          <Link to="/" className="hover:text-zinc-900 underline">首頁</Link>
          <span>›</span>
          <span className="truncate">{loc.pathname}</span>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 py-6 grid gap-4 sm:grid-cols-3 text-sm">
        <div>
          <div className="font-bold">動漫搜尋</div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">輸入片名，一鍵查在哪看。支援模糊搜尋與中日英互通，資料來源 AniList。跨平台比價你的追番清單。</p>
        </div>
        <nav aria-label="底部導航" className="flex flex-wrap gap-2 content-start">
          <Link to="/anime" className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">動漫資料庫</Link>
          <Link to="/platforms" className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">觀看平台</Link>
          <Link to="/search" className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">搜尋</Link>
          <Link to="/season/2026/summer" className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">2026 夏季新番</Link>
          <Link to="/genres/Action" className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">類型：Action</Link>
        </nav>
        <div className="text-xs text-zinc-500">
          <div>資料來源：<a href="https://anilist.co" target="_blank" rel="noreferrer" className="underline">AniList</a> · <a href="https://github.com/0xseanlee/anime-search" target="_blank" rel="noreferrer" className="underline">GitHub</a></div>
          <div className="mt-1">© {new Date().getFullYear()} 動漫搜尋</div>
        </div>
      </div>
    </footer>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="anime-root min-h-screen bg-zinc-50 flex flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
