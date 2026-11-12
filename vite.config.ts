import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['alpha.svg', 'icons/apple-touch-icon.png'],
    manifest: {
      id: './', name: 'Alpha', short_name: 'Alpha', lang: 'es',
      description: 'Registros, evolución y dieta personal.',
      start_url: './', scope: './', display: 'standalone',
      theme_color: '#090909', background_color: '#090909',
      icons: [
        { src: 'icons/alpha-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/alpha-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/alpha-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2,csv}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: false,
      navigateFallback: 'index.html',
    },
    devOptions: { enabled: false },
  })],
})
