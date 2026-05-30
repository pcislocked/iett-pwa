/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { version: APP_VERSION } = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string }

const BUILD_TIMESTAMP = new Date().toISOString()

const emitVersionManifest: Plugin = {
  name: 'emit-version-manifest',
  apply: 'build',
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

export default defineConfig({
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
        name: 'Ä°ETT CanlÄ±',
        short_name: 'Ä°ETT',
        description: 'Ä°stanbul otobÃ¼slerini gerÃ§ek zamanlÄ± takip et',
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
            urlPattern: ({ url }) => url.pathname.endsWith('/version.json'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'iett-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 20 },
            },
          },
          {
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
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/leaflet/') || id.includes('node_modules/react-leaflet/')) {
            return 'vendor-map'
          }
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion'
          }
        },
      },
    },
  },
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
