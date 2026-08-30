import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
    visualizer({
      filename: 'stats.json',
      gzipSize: true,
      brotliSize: true,
      template: 'raw-data',
      sourcemap: true,
    } as any),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icon-*.png', 'icon-*.webp', '**/*.webp'],
      manifest: {
        name: 'Nebula Nomad - Space Exploration on Stellar',
        short_name: 'Nebula Nomad',
        description:
          'Explore procedurally generated nebulae, harvest stardust resources, and upgrade your NFT ship',
        theme_color: '#32d6a5',
        background_color: '#07111f',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp,avif}'],
        // Cache versioning for proper updates (#259)
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Cache-first for static assets (#259)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache-first for fonts
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Network-first for API calls (#259)
          {
            urlPattern: /^https:\/\/horizon-futurenet\.stellar\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stellar-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache-first for external fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // StaleWhileRevalidate for other external resources
          {
            urlPattern: /^https:\/\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
        ],
        // Offline fallback page (#259)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@contexts': resolve(__dirname, 'src/contexts'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@store': resolve(__dirname, 'src/store'),
      '@types': resolve(__dirname, 'src/types'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@config': resolve(__dirname, 'src/config'),
      '@services': resolve(__dirname, 'src/services'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Code splitting by features
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'feature-three'
            }
            if (id.includes('@stellar') || id.includes('@albedo-link')) {
              return 'feature-stellar'
            }
            if (id.includes('react') || id.includes('react-router') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            return 'vendor'
          }
        },
      },
    },
  },
  // Image optimization (#258)
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.webp', '**/*.avif', '**/*.svg'],
})
