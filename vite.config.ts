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

/**
 * Fails the production build when the LogRocket SRI hash in index.html does not match the
 * hash recorded in src/utils/sri.ts (#485). The check only compares committed values; it
 * never fetches the CDN, so it works offline. Refresh both with `npm run sri:update`.
 */
function verifySriIntegrity(): Plugin {
  return {
    name: 'verify-sri-integrity',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const recorded = readFileSync(resolve(__dirname, 'src/utils/sri.ts'), 'utf8').match(
          /integrity: '(sha384-[^']+)'/
        )?.[1]
        const declared = html.match(/script\.integrity = '(sha384-[^']+)'/)?.[1]
        if (!recorded || declared !== recorded) {
          throw new Error(
            `[SRI] index.html integrity (${declared ?? 'missing'}) does not match src/utils/sri.ts (${recorded ?? 'missing'}). Run "npm run sri:update" and commit the result.`
          )
        }
        return html
      },
    },
  }
}

/**
 * Security headers for the dev and preview servers (#487, #489). Keep in sync with
 * vercel.json and nginx.conf, which are the headers production actually serves.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
}

export default defineConfig({
  esbuild: {
    // Production bundles drop debug-level console output. console.warn/error are kept so
    // real failures still reach the browser console and error reporting.
    pure: ['console.log', 'console.debug', 'console.info'],
  },
  plugins: [
    react(),
    inlineCriticalCss(),
    generatePreloadHints(),
    verifySriIntegrity(),
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
      includeAssets: ['vite.svg', 'icon-*.png', 'icon-*.webp', '**/*.webp', 'offline.html'],
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
    // Force a single copy of these packages even if a dependency bundles or
    // resolves its own nested copy, preventing duplicate-React/Three.js bundle
    // bloat and "Invalid hook call" errors from two React copies (#381).
    dedupe: ['react', 'react-dom', 'three'],
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
            // Sentry is loaded via dynamic import (src/services/sentryClient.ts), never
            // statically, so it is never pulled into the critical-path chunks below. Give
            // it its own named chunk anyway so it stays cacheable independently (#382).
            if (id.includes('@sentry')) {
              return 'monitoring'
            }
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
            return 'vendor'
          }
        },
      },
    },
  },
  // Image optimization (#258)
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.webp', '**/*.avif', '**/*.svg'],
  server: {
    headers: SECURITY_HEADERS,
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
})
