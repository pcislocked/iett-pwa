import { useState, useCallback } from 'react'

export type Theme = 'dark' | 'amoled' | 'light'
const STORAGE_KEY = 'iett-pwa-theme'

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* storage blocked */ }
}

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'amoled' || saved === 'light') return saved
  } catch { /* storage blocked */ }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t)
    setThemeState(t)
  }, [])

  return { theme, setTheme }
}
