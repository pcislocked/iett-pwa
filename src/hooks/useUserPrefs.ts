import { useState, useCallback } from 'react'

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
  exportedAt?: string
}

export const PINNED_STOPS_MAX = 7

function createDefaultPrefs(): UserPrefs {
  return { pinnedStops: [], favStops: [], favRoutes: [], nicknames: {}, nearbyRadius: 500, nearbyMax: 15, mockLocation: null, gpsConsent: 'pending' }
}

const KEY = 'iett-prefs'

function load(): UserPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createDefaultPrefs()
    return { ...createDefaultPrefs(), ...(JSON.parse(raw) as Partial<UserPrefs>) }
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

export function useUserPrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(load)

  function patch(fn: (p: UserPrefs) => UserPrefs) {
    setPrefs((prev) => {
      const next = fn(prev)
      persist(next)
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
    patch((p) => ({
      ...p,
      pinnedStops: p.pinnedStops
        .filter((s) => s.dcode !== dcode)
        .map((s, i) => ({ ...s, order: i })),
    }))
  }, [])

  const isPinned = useCallback(
    (dcode: string) => prefs.pinnedStops.some((s) => s.dcode === dcode),
    [prefs.pinnedStops],
  )

  // ── Nicknames ─────────────────────────────────────────────────────────────

  const setNick = useCallback((dcode: string, nick: string) => {
    patch((p) => ({
      ...p,
      nicknames: { ...p.nicknames, [dcode]: nick },
      pinnedStops: p.pinnedStops.map((s) => (s.dcode === dcode ? { ...s, nick } : s)),
    }))
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

  const resetConsent = useCallback(() => {
    patch((p) => ({ ...p, gpsConsent: 'pending' }))
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

  // ── Export / Import ───────────────────────────────────────────────────────

  const exportPrefs = useCallback(() => {
    const data = JSON.stringify(
      { ...prefs, exportedAt: new Date().toISOString() },
      null,
      2,
    )
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iett-prefs-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      a.parentNode?.removeChild(a)
      URL.revokeObjectURL(url)
    }, 3000)
  }, [prefs])

  const importPrefs = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string) as Partial<UserPrefs>
          // Coerce each field to the correct type to guard against malformed files / old schemas
          const coerced: UserPrefs = {
            pinnedStops: (() => {
              if (!Array.isArray(raw.pinnedStops)) return []
              const valid = raw.pinnedStops
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
            favStops: Array.isArray(raw.favStops)
              ? raw.favStops.filter((s): s is FavStop =>
                  s != null && typeof s === 'object' &&
                  typeof s.dcode === 'string' && typeof s.name === 'string'
                )
              : [],
            favRoutes: Array.isArray(raw.favRoutes)
              ? raw.favRoutes.filter((r): r is string => typeof r === 'string')
              : [],
            nicknames: raw.nicknames && typeof raw.nicknames === 'object' && !Array.isArray(raw.nicknames)
              ? Object.fromEntries(
                  Object.entries(raw.nicknames as Record<string, unknown>)
                    .filter(([, v]) => typeof v === 'string')
                ) as Record<string, string>
              : {},
            nearbyRadius: typeof raw.nearbyRadius === 'number' ? raw.nearbyRadius : 500,
            nearbyMax: typeof raw.nearbyMax === 'number' ? raw.nearbyMax : 15,
            mockLocation: Array.isArray(raw.mockLocation) && raw.mockLocation.length === 2 && typeof raw.mockLocation[0] === 'number' && typeof raw.mockLocation[1] === 'number' ? [raw.mockLocation[0], raw.mockLocation[1]] as [number, number] : null,
            gpsConsent: raw.gpsConsent === 'granted' || raw.gpsConsent === 'denied' ? raw.gpsConsent : 'pending',
          }
          patch(() => coerced)
          resolve()
        } catch {
          reject(new Error('Geçersiz dosya formatı'))
        }
      }
      reader.onerror = () => reject(new Error('Dosya okunamadı'))
      reader.readAsText(file)
    })
  }, [])

  return {
    prefs,
    // pinned
    pinStop, unpinStop, isPinned,
    // nicknames
    setNick, getNick,
    // favourites
    toggleFavStop, isFavStop,
    toggleFavRoute, isFavRoute,
    // export/import
    exportPrefs, importPrefs,
    // nearby
    setNearbySettings,
    // mock location
    setMockLocation,
    setGpsConsent,
    resetConsent,
  }
}
