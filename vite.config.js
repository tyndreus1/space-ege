import { defineConfig } from 'vite'

// Göreli taban yolu: GitHub Pages alt klasöründe de çalışır.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 47241,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 47241,
    strictPort: true,
  },
})
