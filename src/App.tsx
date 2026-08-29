import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './components/Layout'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import AnimeListPage from './pages/AnimeListPage'
import AnimeDetailPage from './pages/AnimeDetailPage'
import WhereToWatchPage from './pages/WhereToWatchPage'
import PlatformsPage from './pages/PlatformsPage'
import PlatformPage from './pages/PlatformPage'
import GenresIndexPage, { GenrePage } from './pages/GenresPage'
import SeasonPage from './pages/SeasonPage'

function NotFound(){
  return (
    <div className="max-w-[960px] mx-auto px-4 py-14 text-center">
      <h1 className="text-2xl font-black">找不到頁面</h1>
      <p className="mt-2 text-sm text-zinc-500">連結可能已變更，或輸入錯誤。</p>
      <a href="/anime-search/" className="mt-4 inline-block px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-bold">回首頁</a>
    </div>
  )
}

export default function App(){
  return (
    <BrowserRouter basename="/anime-search">
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/anime" element={<AnimeListPage />} />
          <Route path="/anime/:slug" element={<AnimeDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/platform/:slug" element={<PlatformPage />} />
          <Route path="/where-to-watch/:slug" element={<WhereToWatchPage />} />
          <Route path="/genres" element={<GenresIndexPage />} />
          <Route path="/genres/:genre" element={<GenrePage />} />
          <Route path="/season/:year/:season" element={<SeasonPage />} />
          {/* alias: /genres/Action style already covered */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
