export const SETTINGS_KEY = 'iett_settings'

export interface Settings {
  apiBase: string
  refreshInterval: number
  autoLocate: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  apiBase: '',
  refreshInterval: 20,
  autoLocate: false,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
