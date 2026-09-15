import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Les polices standard de pdf.js (rendu des PDF sans police embarquée, pour le
// caviardage local du n° de sécu) sont copiées dans public/standard_fonts/ par
// `npm run prebuild` / `predev` (scripts/copy-pdf-fonts.mjs).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.jpg', 'logo-mark.webp', 'icon-192.png'],
      manifest: {
        name: 'PayLumo — Analyse de bulletin de paie',
        short_name: 'PayLumo',
        description:
          'Analysez votre bulletin de paie : taux comparés au barème 2026, décomposition brut → net, chaque cotisation expliquée.',
        lang: 'fr',
        theme_color: '#288d3f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'logo.jpg', sizes: '512x512', type: 'image/jpeg' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,jpg,png,webp,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Proxy du proxy IA en dev (npm run server sur :8787).
      '/api': {
        target: process.env.PAYLUMO_API_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
