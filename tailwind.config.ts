/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#00AFF0',
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          900: '#1e3a5f',
        },
        surface: {
          DEFAULT: '#000000',   // AMOLED true black
          card:    '#0d0d0d',
          muted:   '#1a1a1a',
          border:  '#222222',
        },
        text: {
          primary:   '#ffffff',
          secondary: '#888888',
        },
        eta: {
          soon:   '#ef4444',  // < 5 min   — red
          coming: '#f97316',  // 5–10 min  — orange
          close:  '#22c55e',  // 10–20 min — green
          far:    '#555555',  // ≥ 20 min  — gray
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Segoe WP', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
