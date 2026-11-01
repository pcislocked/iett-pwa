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
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        apiBase: sanitizeApiBase(parsed.apiBase ?? ''),
      }
    }
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
    if (parsed.username || parsed.password) return ''
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]'
    const isHttpsPage =
      typeof window !== 'undefined' && window.location?.protocol === 'https:'
    // Block insecure http:// on https:// pages unless targeting localhost
    if (isHttpsPage && parsed.protocol === 'http:' && !isLocalhost) {
      return ''
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '')
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
