import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// PayLumo — application 100 % cliente : aucun backend, tout le traitement du
// bulletin se fait dans le navigateur / la webview.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.jpg'],
      manifest: {
        name: 'PayLumo — Analyse de bulletin de paie',
        short_name: 'PayLumo',
        description:
          'Analysez votre bulletin de paie et repérez les erreurs potentielles. 100 % local, hors-ligne.',
        lang: 'fr',
        theme_color: '#3E9E4E',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'logo.jpg', sizes: '512x512', type: 'image/jpeg' },
          { src: 'logo.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,jpg,woff2,wasm}'],
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
