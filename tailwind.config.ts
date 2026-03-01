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
          soon:   '#22c55e',  // < 5 min
          coming: '#f59e0b',  // 5-15 min
          far:    '#555555',  // > 15 min
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'page-in-right': 'pageInRight 0.22s ease-out',
        'page-in-left':  'pageInLeft  0.22s ease-out',
      },
      keyframes: {
        pageInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pageInLeft: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
