import { useState, useEffect, useCallback } from 'react'

export type Theme = 'dark' | 'amoled' | 'light'
const STORAGE_KEY = 'iett-pwa-theme'

const listeners = new Set<(t: Theme) => void>()

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* storage blocked */ }
  listeners.forEach(l => l(theme))
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

  useEffect(() => {
    const onChange = (t: Theme) => setThemeState(t)
    listeners.add(onChange)

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = e.newValue as Theme
        if (val === 'dark' || val === 'amoled' || val === 'light') {
          setThemeState(val)
          document.documentElement.setAttribute('data-theme', val)
        }
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t)
  }, [])

  return { theme, setTheme }
}
