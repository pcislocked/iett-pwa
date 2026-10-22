import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUserPrefs, PINNED_STOPS_MAX, type ImportResult, type BackupDataV2 } from '../useUserPrefs'

describe('useUserPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty prefs when localStorage is empty', () => {
    const { result } = renderHook(() => useUserPrefs())
    const { prefs } = result.current
    expect(prefs.pinnedStops).toEqual([])
    expect(prefs.favStops).toEqual([])
    expect(prefs.favRoutes).toEqual([])
    expect(prefs.nicknames).toEqual({})
  })

  it('loads saved prefs from localStorage on mount', () => {
    localStorage.setItem(
      'iett-prefs',
      JSON.stringify({ pinnedStops: [], favStops: [], favRoutes: ['500T'], nicknames: {} }),
    )
    const { result } = renderHook(() => useUserPrefs())
    expect(result.current.prefs.favRoutes).toContain('500T')
  })

  it('returns default prefs when localStorage contains invalid JSON', () => {
    localStorage.setItem('iett-prefs', '{bad json}')
    const { result } = renderHook(() => useUserPrefs())
    expect(result.current.prefs.pinnedStops).toEqual([])
  })

  // Pinned stops
  describe('pinStop / unpinStop / isPinned', () => {
    it('pins a stop and marks it as pinned', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.pinStop('220602', 'Home') })
      expect(result.current.isPinned('220602')).toBe(true)
      expect(result.current.prefs.pinnedStops).toHaveLength(1)
      expect(result.current.prefs.pinnedStops[0].nick).toBe('Home')
    })

    it('does not pin the same stop twice', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.pinStop('220602', 'Home') })
      act(() => { result.current.pinStop('220602', 'Home') })
      expect(result.current.prefs.pinnedStops).toHaveLength(1)
    })

    it('enforces a max of 7 pinned stops', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => {
        for (let i = 1; i <= PINNED_STOPS_MAX + 1; i++) {
          result.current.pinStop(`s${i}`, String.fromCharCode(64 + i))
        }
      })
      expect(result.current.prefs.pinnedStops).toHaveLength(PINNED_STOPS_MAX)
    })

    it('unpins a stop and re-indexes order', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => {
        result.current.pinStop('220602', 'A')
        result.current.pinStop('301341', 'B')
      })
      act(() => { result.current.unpinStop('220602') })
      expect(result.current.isPinned('220602')).toBe(false)
      expect(result.current.prefs.pinnedStops[0].order).toBe(0)
    })
  })

  // Nicknames
  describe('setNick / getNick', () => {
    it('sets a nickname and retrieves it', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.setNick('220602', 'Ev') })
      expect(result.current.getNick('220602')).toBe('Ev')
    })

    it('returns null for unknown dcode', () => {
      const { result } = renderHook(() => useUserPrefs())
      expect(result.current.getNick('unknown')).toBeNull()
    })

    it('updates nickname on a pinned stop as well', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.pinStop('220602', 'Old') })
      act(() => { result.current.setNick('220602', 'New') })
      expect(result.current.prefs.pinnedStops[0].nick).toBe('New')
    })
  })

  // Favourite stops
  describe('toggleFavStop / isFavStop', () => {
    it('adds a stop to favourites', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.toggleFavStop('220602', 'LEVENT') })
      expect(result.current.isFavStop('220602')).toBe(true)
    })

    it('removes a stop already in favourites', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.toggleFavStop('220602', 'LEVENT') })
      act(() => { result.current.toggleFavStop('220602', 'LEVENT') })
      expect(result.current.isFavStop('220602')).toBe(false)
    })
  })

  // Favourite routes
  describe('toggleFavRoute / isFavRoute', () => {
    it('adds a route to favourites', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.toggleFavRoute('500T') })
      expect(result.current.isFavRoute('500T')).toBe(true)
    })

    it('removes a route already in favourites', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.toggleFavRoute('500T') })
      act(() => { result.current.toggleFavRoute('500T') })
      expect(result.current.isFavRoute('500T')).toBe(false)
    })
  })

  // Persistence
  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useUserPrefs())
    act(() => { result.current.toggleFavRoute('15F') })
    const stored = JSON.parse(localStorage.getItem('iett-prefs') ?? '{}') as { favRoutes: string[] }
    expect(stored.favRoutes).toContain('15F')
  })

  // Wake lock & Haptics toggles
  describe('keepScreenAwake & hapticFeedback', () => {
    it('defaults keepScreenAwake to false and hapticFeedback to true', () => {
      const { result } = renderHook(() => useUserPrefs())
      expect(result.current.prefs.keepScreenAwake).toBe(false)
      expect(result.current.prefs.hapticFeedback).toBe(true)
    })

    it('updates keepScreenAwake', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.setKeepScreenAwake(true) })
      expect(result.current.prefs.keepScreenAwake).toBe(true)
    })

    it('updates hapticFeedback', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => { result.current.setHapticFeedback(false) })
      expect(result.current.prefs.hapticFeedback).toBe(false)
    })
  })

  // Backup & Restore
  describe('exportAllData and importAllData', () => {
    it('exports data according to unified v2 schema', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => {
        result.current.pinStop('1001', 'Test Stop')
        result.current.setKeepScreenAwake(true)
      })

      const backup = result.current.exportAllData()
      expect(backup._schemaVersion).toBe(2)
      expect(backup._app).toBe('iett-pwa')
      expect(backup.metadata).toHaveProperty('exportedAt')
      expect(backup.metadata).toHaveProperty('appVersion')
      expect(backup.preferences.pinnedStops[0].nick).toBe('Test Stop')
      expect(backup.preferences.keepScreenAwake).toBe(true)
    })

    it('imports v2 backup successfully', async () => {
      const { result } = renderHook(() => useUserPrefs())
      const v2Payload = {
        _schemaVersion: 2,
        _app: 'iett-pwa',
        metadata: {
          appVersion: '0.4.9',
          exportedAt: new Date().toISOString(),
          timestamp: Date.now(),
        },
        preferences: {
          pinnedStops: [{ dcode: '5555', nick: 'V2 Stop', order: 0 }],
          favStops: [],
          favRoutes: ['34AS'],
          nicknames: {},
          gpsConsent: null,
          nearbyRadius: 600,
          nearbyMax: 15,
          timestampMode: 'relative',
          timebarFormat: 'emoji',
          showCurrentTime: true,
          keepScreenAwake: true,
          hapticFeedback: false,
        },
        searchHistory: [{ kind: 'stop', code: '1001', name: 'Kadıköy' }],
        ui: {
          theme: 'amoled',
          language: 'tr',
        },
      }

      const file = new File([JSON.stringify(v2Payload)], 'backup-v2.json', { type: 'application/json' })
      let importRes: ImportResult | undefined
      await act(async () => {
        importRes = await result.current.importAllData(file)
      })

      expect(importRes?.success).toBe(true)
      expect(result.current.prefs.pinnedStops[0].nick).toBe('V2 Stop')
      expect(result.current.prefs.favRoutes).toContain('34AS')
      expect(result.current.prefs.keepScreenAwake).toBe(true)
      expect(result.current.prefs.hapticFeedback).toBe(false)
      expect(localStorage.getItem('iett_recent')).toContain('Kadıköy')
      expect(localStorage.getItem('iett-pwa-theme')).toBe('amoled')
    })

    it('migrates and restores legacy v1 backup with versionNotice', async () => {
      const { result } = renderHook(() => useUserPrefs())
      const v1Payload = {
        pinnedStops: [{ dcode: '1111', nick: 'Legacy V1 Stop', order: 0 }],
        favStops: ['1111'],
        favRoutes: ['500T'],
        nicknames: { '1111': 'Legacy V1 Stop' },
      }

      const file = new File([JSON.stringify(v1Payload)], 'backup-v1.json', { type: 'application/json' })
      let importRes: ImportResult | undefined
      await act(async () => {
        importRes = await result.current.importAllData(file)
      })

      expect(importRes?.success).toBe(true)
      expect(importRes?.versionNotice).toBeDefined()
      expect(result.current.prefs.pinnedStops[0].nick).toBe('Legacy V1 Stop')
      expect(result.current.prefs.favRoutes).toContain('500T')
      // defaults should remain stable
      expect(result.current.prefs.keepScreenAwake).toBe(false)
      expect(result.current.prefs.hapticFeedback).toBe(true)
    })

    it('fails gracefully on invalid json file', async () => {
      const { result } = renderHook(() => useUserPrefs())
      const file = new File(['not a valid json content'], 'corrupted.json', { type: 'application/json' })
      let importRes: ImportResult | undefined
      await act(async () => {
        importRes = await result.current.importAllData(file)
      })

      expect(importRes?.success).toBe(false)
      expect(importRes?.error).toBeDefined()
    })

    it('exports and restores satellite preference correctly from localStorage', async () => {
      localStorage.setItem('map-satellite', '1')
      const { result } = renderHook(() => useUserPrefs())
      let backup: BackupDataV2 | undefined
      act(() => {
        backup = result.current.exportAllData()
      })
      expect(backup?.ui.satellite).toBe(true)

      // Test importing satellite: false
      const v2Payload = {
        _schemaVersion: 2,
        _app: 'iett-pwa',
        preferences: {},
        ui: {
          satellite: false,
        },
      }
      await act(async () => {
        await result.current.importAllData(JSON.stringify(v2Payload))
      })
      expect(localStorage.getItem('map-satellite')).toBe('0')
      expect(localStorage.getItem('iett_satellite')).toBe('false')
    })
  })

  describe('cross-hook instance synchronization', () => {
    it('synchronizes preferences across multiple hook instances', () => {
      const hookA = renderHook(() => useUserPrefs())
      const hookB = renderHook(() => useUserPrefs())

      expect(hookA.result.current.prefs.gpsConsent).toBe('pending')
      expect(hookB.result.current.prefs.gpsConsent).toBe('pending')

      act(() => {
        hookA.result.current.setGpsConsent('denied')
      })

      expect(hookA.result.current.prefs.gpsConsent).toBe('denied')
      expect(hookB.result.current.prefs.gpsConsent).toBe('denied')
    })
  })
})
