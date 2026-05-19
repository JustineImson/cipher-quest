import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cipher Quest',
        short_name: 'Cipher',
        theme_color: '#0d131f',
        background_color: '#0d131f',
        orientation: "landscape",
        display: "fullscreen",
        icons: [
          {
            src: '/pwaIcon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwaIcon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000, // 10MB to accommodate Phaser bundle, audio, etc.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2,mp3,wav}'],
        importScripts: ['/firebase-messaging-sw.js']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
