import { defineConfig } from 'vite'
import { mergeConfig, defineConfig as defineTestConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const viteConfig = defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
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
