import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Runtime dependencies of @stellar/stellar-sdk 17 that only the SDK uses.
 * (`@noble/hashes` is left out on purpose: WalletConnect bundles its own copies, and
 * claiming them here would make the wallet chunk import the whole Stellar chunk.)
 */
const STELLAR_SDK_DEPENDENCIES = [
  '@exodus/bytes',
  '@noble/ed25519',
  'bignumber.js',
  'eventsource',
  'feaxios',
  'smol-toml',
  'uint8array-extras',
]

/**
 * Inlines src/styles/critical.css into index.html so first paint does not wait
 * for the bundled stylesheet.
 */
function inlineCriticalCss(): Plugin {
  return {
    name: 'inline-critical-css',
    transformIndexHtml() {
      const css = readFileSync(resolve(__dirname, 'src/styles/critical.css'), 'utf8')
      return [
        { tag: 'style', attrs: { 'data-critical': '' }, children: css, injectTo: 'head-prepend' },
      ]
    },
  }
}

/**
 * Injects preload hints for critical resources to optimize LCP and CLS (#379).
 */
function generatePreloadHints(): Plugin {
  return {
    name: 'generate-preload-hints',
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            href: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2',
            crossorigin: 'anonymous',
          },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    inlineCriticalCss(),
    generatePreloadHints(),
    visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
    visualizer({
      filename: 'stats.json',
      gzipSize: true,
      brotliSize: true,
      template: 'raw-data',
      sourcemap: true,
    }),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): the plugin only readies the new service
      // worker and lets the app decide when to activate it, so the update
      // notification (issue #325) controls the moment of `skipWaiting`
      // instead of it happening silently in the background.
      registerType: 'prompt',
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
        cacheId: 'stellar-nebula',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Hashed build output never changes for a given URL, so cache it indefinitely
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'build-assets-cache',
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
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
            urlPattern: /^https:\/\/[^/]+\.stellar\.org\/.*/i,
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
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
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
    // Force a single copy of these packages even if a transitive dependency
    // declares its own (compatible) semver range for one of them. Without this,
    // libraries like @react-three/drei or postprocessing can end up bundling
    // their own copy of react/three, doubling an already-large chunk and, for
    // React, silently breaking hooks across the two copies (#381).
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
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
    modulePreload: {
      polyfill: true,
    },
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
            // stellar-sdk 17 no longer inlines its crypto/XDR/encoding helpers into
            // @stellar/stellar-base; they are separate packages now. Keep them in the
            // Stellar feature chunk so they load with the SDK instead of growing the
            // vendor chunk every page downloads.
            if (STELLAR_SDK_DEPENDENCIES.some((dep) => id.includes(`/node_modules/${dep}/`))) {
              return 'feature-stellar'
            }
            if (id.includes('react') || id.includes('react-router') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            // Sentry/LogRocket setup (Sentry.init, replay, tracing) is deferred to
            // an idle callback after the app renders (src/main.tsx, #382); keeping
            // the SDK in its own chunk - rather than folded into "vendor" - means
            // its own weight can be tracked/budgeted separately and it is cached
            // independently of unrelated vendor code that changes more often.
            if (id.includes('@sentry/')) {
              return 'monitoring-vendor'
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
