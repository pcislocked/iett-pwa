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

export function sanitizeApiBase(url: string): string {
  if (typeof url !== 'string') return ''
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
  } catch { /* invalid URL */ }
  return ''
}

export function saveSettings(settings: Settings): void {
  try {
    const sanitized: Settings = {
      ...settings,
      apiBase: sanitizeApiBase(settings.apiBase),
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized))
  } catch {
    /* ignore QuotaExceededError / SecurityError (private mode, storage disabled) */
  }
}
