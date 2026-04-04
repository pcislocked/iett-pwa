import { defineConfig } from 'vite'
import { mergeConfig, defineConfig as defineTestConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { version: APP_VERSION } = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string }

const BUILD_TIMESTAMP = new Date().toISOString()

const emitVersionManifest = {
  name: 'emit-version-manifest',
  apply: 'build' as const,
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify(
        {
          version: APP_VERSION,
          builtAt: BUILD_TIMESTAMP,
        },
        null,
        2,
      ),
    })
  },
}

const viteConfig = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    emitVersionManifest,
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: {
        name: 'IETT Canli',
        short_name: 'IETT',
        description: 'Istanbul otobuslerini gercek zamanli takip et',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Version manifest must always come from network to detect new deploys.
            urlPattern: ({ url }) => url.pathname.endsWith('/version.json'),
            handler: 'NetworkOnly',
          },
          {
            // Cache iett-middle API responses for 20 s
            urlPattern: /\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'iett-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 20 },
            },
          },
          {
            // Cache map tiles longer
            urlPattern: /cartodb|openstreetmap/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/v1': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

export default mergeConfig(
  viteConfig,
  defineTestConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      alias: { '@': path.resolve(__dirname, 'src') },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
      },
    },
  }),
)
