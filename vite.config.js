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
        display: 'standalone',
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
        maximumFileSizeToCacheInBytes: 4000000 // 4MB to accommodate Phaser bundle
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
