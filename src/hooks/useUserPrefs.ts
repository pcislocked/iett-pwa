import { useState, useEffect, useCallback } from 'react'
import { applyTheme, type Theme } from '@/hooks/useTheme'
import i18n from '@/i18n'
import { loadSettings, saveSettings, type Settings } from '@/utils/settings'
import { getRecent, type RecentSearch } from '@/hooks/useRecentSearches'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinnedStop {
  dcode: string
  nick: string
  order: number
}

export interface FavStop {
  dcode: string
  name: string
  nick?: string
}

export interface UserPrefs {
  pinnedStops: PinnedStop[]
  favStops: FavStop[]
  favRoutes: string[]              // hat_kodu[]
  nicknames: Record<string, string> // dcode → nick
  nearbyRadius: number
  nearbyMax: number
  mockLocation: [number, number] | null
  gpsConsent: 'pending' | 'granted' | 'denied'
  timestampMode: 'relative' | 'absolute' | 'both'
  timebarFormat: 'standard' | 'compact' | 'emoji'
  showCurrentTime: boolean
  keepScreenAwake: boolean
  hapticFeedback: boolean
  exportedAt?: string
}

export const PINNED_STOPS_MAX = 7

export const DEFAULT_PREFS: UserPrefs = {
  pinnedStops: [],
  favStops: [],
  favRoutes: [],
  nicknames: {},
  nearbyRadius: 2000,
  nearbyMax: 10,
  mockLocation: null,
  gpsConsent: 'pending',
  timestampMode: 'both',
  timebarFormat: 'standard',
  showCurrentTime: false,
  keepScreenAwake: false,
  hapticFeedback: true,
}

export interface BackupDataV2 {
  _schemaVersion: 2
  _app: 'iett-pwa'
  metadata: {
    exportedAt: string
    appVersion: string
    backendVersion?: string | null
  }
  preferences: UserPrefs
  searchHistory: RecentSearch[]
  ui: {
    theme: string | null
    language: string | null
    satellite?: boolean
  }
  settings: Settings
}

export interface ImportResult {
  success: boolean
  versionNotice?: string
  error?: string
  counts?: {
    pinned: number
    favStops: number
    favRoutes: number
    recents: number
  }
}

function createDefaultPrefs(): UserPrefs {
  return { ...DEFAULT_PREFS }
}

const KEY = 'iett-prefs'

export function coercePrefs(raw: unknown): UserPrefs {
  if (!raw || typeof raw !== 'object') return createDefaultPrefs()
  const r = raw as Partial<UserPrefs>

  return {
    pinnedStops: (() => {
      if (!Array.isArray(r.pinnedStops)) return []
      const valid = r.pinnedStops
        .filter((s): s is PinnedStop =>
          s != null && typeof s === 'object' &&
          typeof s.dcode === 'string' && typeof s.nick === 'string'
        )
        .map((s, i) => ({ dcode: s.dcode, nick: s.nick, order: typeof s.order === 'number' ? s.order : i }))
      const seen = new Set<string>()
      const deduped: PinnedStop[] = []
      for (const stop of [...valid].sort((a, b) => a.order - b.order)) {
        if (!seen.has(stop.dcode)) { seen.add(stop.dcode); deduped.push(stop) }
      }
      return deduped.slice(0, PINNED_STOPS_MAX).map((s, i) => ({ ...s, order: i }))
    })(),
    favStops: Array.isArray(r.favStops)
      ? r.favStops.filter((s): s is FavStop =>
          s != null && typeof s === 'object' &&
          typeof s.dcode === 'string' && typeof s.name === 'string'
        )
      : [],
    favRoutes: Array.isArray(r.favRoutes)
      ? r.favRoutes.filter((item): item is string => typeof item === 'string')
      : [],
    nicknames: r.nicknames && typeof r.nicknames === 'object' && !Array.isArray(r.nicknames)
      ? Object.fromEntries(
          Object.entries(r.nicknames as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'string')
        ) as Record<string, string>
      : {},
    nearbyRadius: typeof r.nearbyRadius === 'number' ? r.nearbyRadius : 2000,
    nearbyMax: typeof r.nearbyMax === 'number' ? r.nearbyMax : 10,
    mockLocation: Array.isArray(r.mockLocation) && r.mockLocation.length === 2 && typeof r.mockLocation[0] === 'number' && typeof r.mockLocation[1] === 'number'
      ? [r.mockLocation[0], r.mockLocation[1]] as [number, number]
      : null,
    gpsConsent: r.gpsConsent === 'granted' || r.gpsConsent === 'denied' ? r.gpsConsent : 'pending',
    timestampMode: (r.timestampMode === 'relative' || r.timestampMode === 'absolute' || r.timestampMode === 'both')
      ? r.timestampMode
      : 'both',
    timebarFormat: (r.timebarFormat === 'compact' || r.timebarFormat === 'emoji' || r.timebarFormat === 'standard')
      ? r.timebarFormat
      : 'standard',
    showCurrentTime: typeof r.showCurrentTime === 'boolean' ? r.showCurrentTime : false,
    keepScreenAwake: typeof r.keepScreenAwake === 'boolean' ? r.keepScreenAwake : false,
    hapticFeedback: typeof r.hapticFeedback === 'boolean' ? r.hapticFeedback : true,
    exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : undefined,
  }
}

function load(): UserPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createDefaultPrefs()
    return coercePrefs(JSON.parse(raw))
  } catch {
    return createDefaultPrefs()
  }
}

function persist(p: UserPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch { /* quota / private mode */ }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// Active listeners for cross-hook synchronization within the same window
const prefsListeners = new Set<(p: UserPrefs) => void>()

function broadcastPrefs(p: UserPrefs) {
  prefsListeners.forEach((listener) => {
    try {
      listener(p)
    } catch {
      // ignore
    }
  })
}

export function useUserPrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(load)

  useEffect(() => {
    prefsListeners.add(setPrefs)
    return () => {
      prefsListeners.delete(setPrefs)
    }
  }, [])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const loaded = coercePrefs(JSON.parse(e.newValue))
          setPrefs(loaded)
        } catch { /* storage format mismatch */ }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function patch(fn: (p: UserPrefs) => UserPrefs) {
    setPrefs((prev) => {
      const next = fn(prev)
      persist(next)
      broadcastPrefs(next)
      return next
    })
  }

  // ── Pinned stops ──────────────────────────────────────────────────────────

  const pinStop = useCallback((dcode: string, nick: string) => {
    patch((p) => {
      if (p.pinnedStops.length >= PINNED_STOPS_MAX) return p
      if (p.pinnedStops.some((s) => s.dcode === dcode)) return p
      return {
        ...p,
        pinnedStops: [...p.pinnedStops, { dcode, nick, order: p.pinnedStops.length }],
      }
    })
  }, [])

  const unpinStop = useCallback((dcode: string) => {
    patch((p) => {
      const remaining = p.pinnedStops
        .filter((s) => s.dcode !== dcode)
        .map((s, idx) => ({ ...s, order: idx }))
      return { ...p, pinnedStops: remaining }
    })
  }, [])

  const isPinned = useCallback(
    (dcode: string) => prefs.pinnedStops.some((s) => s.dcode === dcode),
    [prefs.pinnedStops],
  )

  const reorderPinnedStops = useCallback((fromIndex: number, toIndex: number) => {
    patch((p) => {
      const list = [...p.pinnedStops]
      const [moved] = list.splice(fromIndex, 1)
      if (!moved) return p
      list.splice(toIndex, 0, moved)
      return { ...p, pinnedStops: list.map((s, i) => ({ ...s, order: i })) }
    })
  }, [])

  // ── Nicknames ─────────────────────────────────────────────────────────────

  const setNick = useCallback((dcode: string, nick: string) => {
    patch((p) => {
      const trimmed = nick.trim()
      const nicknames = { ...p.nicknames }
      if (trimmed) {
        nicknames[dcode] = trimmed
      } else {
        delete nicknames[dcode]
      }
      const pinnedStops = p.pinnedStops.map((s) =>
        s.dcode === dcode ? { ...s, nick: trimmed || s.nick } : s
      )
      return { ...p, nicknames, pinnedStops }
    })
  }, [])

  const setNearbySettings = useCallback((radius: number, max: number) => {
    patch((p) => ({ ...p, nearbyRadius: radius, nearbyMax: max }))
  }, [])

  const getNick = useCallback(
    (dcode: string) => prefs.nicknames[dcode] ?? null,
    [prefs.nicknames],
  )

  // ── Mock Location & Consent ───────────────────────────────────────────────

  const setMockLocation = useCallback((lat: number, lng: number) => {
    patch((p) => ({ ...p, mockLocation: [lat, lng] }))
  }, [])

  const setGpsConsent = useCallback((status: 'pending' | 'granted' | 'denied') => {
    patch((p) => ({ ...p, gpsConsent: status }))
  }, [])

  const setTimestampMode = useCallback((mode: 'relative' | 'absolute' | 'both') => {
    patch((p) => ({ ...p, timestampMode: mode }))
  }, [])

  const setTimebarFormat = useCallback((format: 'standard' | 'compact' | 'emoji') => {
    patch((p) => ({ ...p, timebarFormat: format }))
  }, [])

  const setShowCurrentTime = useCallback((show: boolean) => {
    patch((p) => ({ ...p, showCurrentTime: show }))
  }, [])

  const setKeepScreenAwake = useCallback((awake: boolean) => {
    patch((p) => ({ ...p, keepScreenAwake: awake }))
  }, [])

  const setHapticFeedback = useCallback((enabled: boolean) => {
    patch((p) => ({ ...p, hapticFeedback: enabled }))
  }, [])

  const resetConsent = useCallback(() => {
    patch((p) => ({ ...p, gpsConsent: 'pending', mockLocation: null }))
  }, [])

  // ── Favourite stops ───────────────────────────────────────────────────────

  const toggleFavStop = useCallback((dcode: string, name: string) => {
    patch((p) => {
      const exists = p.favStops.some((s) => s.dcode === dcode)
      return {
        ...p,
        favStops: exists
          ? p.favStops.filter((s) => s.dcode !== dcode)
          : [...p.favStops, { dcode, name }],
      }
    })
  }, [])

  const isFavStop = useCallback(
    (dcode: string) => prefs.favStops.some((s) => s.dcode === dcode),
    [prefs.favStops],
  )

  // ── Favourite routes ──────────────────────────────────────────────────────

  const toggleFavRoute = useCallback((hat_kodu: string) => {
    patch((p) => ({
      ...p,
      favRoutes: p.favRoutes.includes(hat_kodu)
        ? p.favRoutes.filter((r) => r !== hat_kodu)
        : [...p.favRoutes, hat_kodu],
    }))
  }, [])

  const isFavRoute = useCallback(
    (hat_kodu: string) => prefs.favRoutes.includes(hat_kodu),
    [prefs.favRoutes],
  )

  // ── Unified Export / Import (Schema v2 with v1 Backward Compatibility) ───

  const exportAllData = useCallback((backendVersion?: string | null) => {
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.4.10.3'
    const recents = getRecent()
    const theme = (typeof localStorage !== 'undefined' && localStorage.getItem('iett-pwa-theme')) || 'amoled'
    const language = (typeof localStorage !== 'undefined' && localStorage.getItem('iett-pwa-lang')) || i18n.language || 'tr'
    const satellite = typeof localStorage !== 'undefined' && (localStorage.getItem('map-satellite') === '1' || localStorage.getItem('iett_satellite') === 'true')
    const settings = loadSettings()

    const backup: BackupDataV2 = {
      _schemaVersion: 2,
      _app: 'iett-pwa',
      metadata: {
        exportedAt: new Date().toISOString(),
        appVersion,
        backendVersion: backendVersion ?? null,
      },
      preferences: { ...prefs, exportedAt: new Date().toISOString() },
      searchHistory: recents,
      ui: {
        theme,
        language,
        satellite,
      },
      settings,
    }

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof document !== 'undefined') {
      const data = JSON.stringify(backup, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `iett-backup-v${appVersion}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        a.parentNode?.removeChild(a)
        URL.revokeObjectURL(url)
      }, 3000)
    }

    return backup
  }, [prefs])

  const importAllData = useCallback(async (fileOrJson: File | string): Promise<ImportResult> => {
    try {
      let rawText = ''
      if (typeof fileOrJson === 'string') {
        rawText = fileOrJson
      } else {
        // Enforce 2MB maximum file size limit
        if (fileOrJson.size > 2 * 1024 * 1024) {
          return { success: false, error: 'Dosya boyutu çok büyük (Maksimum 2 MB)' }
        }
        rawText = await fileOrJson.text()
      }

      const parsed = JSON.parse(rawText) as Record<string, unknown>
      const currentAppVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.4.10.3'

      // Detect Schema v2
      if (parsed._schemaVersion === 2 && parsed._app === 'iett-pwa') {
        const v2 = parsed as unknown as BackupDataV2
        const coerced = coercePrefs(v2.preferences)
        patch(() => coerced)

        // Restore Search History
        if (Array.isArray(v2.searchHistory)) {
          const validRecents: RecentSearch[] = v2.searchHistory
            .filter((r): r is RecentSearch =>
              r != null && typeof r === 'object' &&
              (r.kind === 'stop' || r.kind === 'route') &&
              typeof r.code === 'string' && typeof r.name === 'string'
            )
            .slice(0, 25)
          try {
            localStorage.setItem('iett_recent', JSON.stringify(validRecents))
          } catch { /* storage blocked */ }
        }

        // Restore UI Theme
        if (v2.ui?.theme && (v2.ui.theme === 'dark' || v2.ui.theme === 'amoled' || v2.ui.theme === 'light')) {
          applyTheme(v2.ui.theme as Theme)
        }

        // Restore UI Language
        if (v2.ui?.language && ['tr', 'en', 'ku'].includes(v2.ui.language)) {
          try {
            localStorage.setItem('iett-pwa-lang', v2.ui.language)
            void i18n.changeLanguage(v2.ui.language)
          } catch { /* storage blocked */ }
        }

        // Restore Satellite map setting
        if (typeof v2.ui?.satellite === 'boolean') {
          try {
            localStorage.setItem('map-satellite', v2.ui.satellite ? '1' : '0')
            localStorage.setItem('iett_satellite', String(v2.ui.satellite))
          } catch { /* storage blocked */ }
        }

        // Restore Settings
        if (v2.settings && typeof v2.settings === 'object') {
          const s = v2.settings as Partial<Settings>
          let safeApiBase = ''
          if (typeof s.apiBase === 'string') {
            const trimmed = s.apiBase.trim().replace(/\/+$/, '')
            if (trimmed === '' || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
              safeApiBase = trimmed
            } else {
              try {
                const parsedUrl = new URL(trimmed)
                if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
                  safeApiBase = trimmed
                }
              } catch { /* ignore invalid URL */ }
            }
          }
          const safeRefresh =
            typeof s.refreshInterval === 'number' && Number.isFinite(s.refreshInterval)
              ? Math.min(120, Math.max(10, Math.round(s.refreshInterval)))
              : 20
          saveSettings({
            apiBase: safeApiBase,
            refreshInterval: safeRefresh,
            autoLocate: typeof s.autoLocate === 'boolean' ? s.autoLocate : false,
          })
        }

        let versionNotice: string | undefined
        if (v2.metadata?.appVersion && v2.metadata.appVersion !== currentAppVersion) {
          versionNotice = `v${v2.metadata.appVersion} sürümünden alınan yedek başarıyla v${currentAppVersion} sürümüne uyarlandı.`
        }

        return {
          success: true,
          versionNotice,
          counts: {
            pinned: coerced.pinnedStops.length,
            favStops: coerced.favStops.length,
            favRoutes: coerced.favRoutes.length,
            recents: Array.isArray(v2.searchHistory) ? v2.searchHistory.length : 0,
          },
        }
      }

      // Backward Compatibility: Schema v1
      if ('pinnedStops' in parsed || 'favStops' in parsed || 'favRoutes' in parsed) {
        const coerced = coercePrefs(parsed)
        patch(() => coerced)
        return {
          success: true,
          versionNotice: 'Eski sürüm (v1) yedeği başarıyla içe aktarıldı. Arama geçmişi ve tema tercihleri korundu.',
          counts: {
            pinned: coerced.pinnedStops.length,
            favStops: coerced.favStops.length,
            favRoutes: coerced.favRoutes.length,
            recents: getRecent().length,
          },
        }
      }

      return { success: false, error: 'Bilinmeyen veya desteklenmeyen yedek formatı.' }
    } catch {
      return { success: false, error: 'Dosya içeriği geçerli bir JSON değil.' }
    }
  }, [])

  // Backward-compatible wrappers for exportPrefs and importPrefs
  const exportPrefs = useCallback(() => {
    exportAllData()
  }, [exportAllData])

  const importPrefs = useCallback(async (file: File): Promise<void> => {
    const res = await importAllData(file)
    if (!res.success) {
      throw new Error(res.error || 'İçe aktarma başarısız oldu')
    }
  }, [importAllData])

  return {
    prefs,
    // pinned
    pinStop, unpinStop, isPinned, reorderPinnedStops,
    // nicknames
    setNick, getNick,
    // favourites
    toggleFavStop, isFavStop,
    toggleFavRoute, isFavRoute,
    // export/import
    exportPrefs, importPrefs,
    exportAllData, importAllData,
    // nearby
    setNearbySettings,
    // mock location
    setMockLocation,
    setGpsConsent,
    setTimestampMode,
    setTimebarFormat,
    setShowCurrentTime,
    setKeepScreenAwake,
    setHapticFeedback,
    resetConsent,
  }
}
