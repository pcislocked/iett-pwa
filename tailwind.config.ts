/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a5f',
        },
        surface: {
          DEFAULT: '#0f172a',
          card:    '#1e293b',
          muted:   '#334155',
        },
        eta: {
          soon:   '#22c55e',  // < 5 min
          coming: '#f59e0b',  // 5-15 min
          far:    '#94a3b8',  // > 15 min
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
