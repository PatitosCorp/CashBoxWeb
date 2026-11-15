import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'fonts/*.ttf'],
      manifest: {
        name: 'CashBox',
        short_name: 'CashBox',
        description: 'Punto de venta para tu negocio',
        lang: 'es',
        theme_color: '#1677ff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only; Supabase data is never cached by the service worker (online-first).
        globPatterns: ['**/*.{js,css,html,svg,png,ttf}'],
        navigateFallbackDenylist: [/^\/auth/],
      },
    }),
  ],
  test: { environment: 'node' },
})
