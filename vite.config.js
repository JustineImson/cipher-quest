import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // expose to LAN so phone can reach it
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      },
      '/ml': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/notify': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'firebase-messaging-sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'inline',

      // ─── Bumps individual asset limit to 10MB to handle large JS bundles ───
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10000000,
      },

      manifest: {
        name: 'Cipher Quest',
        short_name: 'Cipher',
        gcm_sender_id: '1039547441517',
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
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/ml/, /^\/notify/, /^\/admin/],
        runtimeCaching: [
          {
            urlPattern: /\/(socket\.io|ml|notify|admin)(\?.*)?$/,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\//,
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})