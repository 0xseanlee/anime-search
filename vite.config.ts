import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: 倉庫名作為 base（https://0xseanlee.github.io/anime-search/）
// 若改為 user/organization pages（https://0xseanlee.github.io/）把 base 改為 '/'
export default defineConfig({
  plugins: [react()],
  base: '/anime-search/',
})
