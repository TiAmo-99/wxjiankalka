import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

const outDir = path.resolve(__dirname, '../public/admin')

export default defineConfig(() => ({
  base: '/admin/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://server.jiankalka.cn',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir,
    emptyOutDir: true
  }
}))
