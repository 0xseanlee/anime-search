import { Link } from 'react-router-dom'
import { PLATFORMS } from '../seo/platforms'
import { Seo } from '../seo/Seo'
import { breadcrumbJsonLd, collectionPageJsonLd } from '../seo/schema'

export default function PlatformsPage(){
  return (
    <>
      <Seo
        title="動漫觀看平台 / 動漫上架平台 一覽"
        description="整理 Netflix、Disney+、Crunchyroll、Prime Video、Bilibili、巴哈姆特動畫瘋等動漫觀看平台，點平台查看該平台有上架的動漫與在哪看連結。"
        path="/platforms"
        jsonLd={[collectionPageJsonLd('動漫觀看平台', '依平台瀏覽動漫', '/platforms'), breadcrumbJsonLd([{ name:'首頁', path:'/' },{ name:'觀看平台', path:'/platforms' }])]}
      />
      <div className="max-w-[1280px] mx-auto w-full px-3 sm:px-4 py-6">
        <h1 className="text-xl font-black">動漫觀看平台 / 上架平台</h1>
        <p className="mt-1 text-sm text-zinc-500">選一個平台，查看該平台有上架的動漫（依 AniList externalLinks 判斷）。</p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORMS.map(p=> (
            <Link key={p.slug} to={`/platform/${p.slug}`} className="rounded-2xl border bg-white p-4 hover:border-violet-300 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: p.color, color: p.fg }}>{p.label.slice(0,2)}</span>
              <span className="font-bold text-sm">{p.label}</span>
              <span className="ml-auto text-xs text-zinc-500">查看 →</span>
            </Link>
          ))}
        </div>
        <section className="mt-8 border-t pt-4 text-xs text-zinc-600">
          <h2 className="font-bold">如何使用</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>平台頁會列出該平台有上架的動漫卡片，每部可點進 <code>/anime/:slug</code> 與 <code>/where-to-watch/:slug</code></li>
            <li>站內也支援 <Link to="/search" className="underline text-violet-600">搜尋</Link>、<Link to="/anime" className="underline text-violet-600">動漫資料庫</Link>、<Link to="/season/2026/summer" className="underline text-violet-600">季度新番</Link> 與類型頁的交叉瀏覽</li>
          </ul>
        </section>
      </div>
    </>
  )
}
