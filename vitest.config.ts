import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
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
})
