import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserPrefs, PINNED_STOPS_MAX } from '../useUserPrefs'

describe('useUserPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
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

  // Export / Import
  describe('exportPrefs / importPrefs', () => {
    it('exports prefs by triggering download', () => {
      vi.useFakeTimers()
      
      const originalCreate = global.URL.createObjectURL
      const originalRevoke = global.URL.revokeObjectURL
      
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
      global.URL.revokeObjectURL = vi.fn()
      
      const mockClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      const { result } = renderHook(() => useUserPrefs())
      
      act(() => {
        result.current.exportPrefs()
      })
      
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
      expect(mockClick).toHaveBeenCalled()
      
      mockClick.mockRestore()
      
      global.URL.createObjectURL = originalCreate
      global.URL.revokeObjectURL = originalRevoke
      
      vi.useRealTimers()
    })

    it('imports prefs correctly', async () => {
      const { result } = renderHook(() => useUserPrefs())
      const data = JSON.stringify({
        pinnedStops: [{ dcode: '123', nick: 'Test', order: 0 }],
        favStops: [{ dcode: '123', name: 'Test Name' }],
        favRoutes: ['123'],
        nicknames: { '123': 'Test' }
      })
      const file = new File([data], 'prefs.json', { type: 'application/json' })
      
      await act(async () => {
        await result.current.importPrefs(file)
      })

      expect(result.current.prefs.favRoutes).toContain('123')
      expect(result.current.prefs.pinnedStops[0].dcode).toBe('123')
    })

    it('rejects import if format is invalid', async () => {
      const { result } = renderHook(() => useUserPrefs())
      const file = new File(['invalid json'], 'prefs.json', { type: 'application/json' })
      
      let error: any;
      await act(async () => {
        try {
          await result.current.importPrefs(file)
        } catch (e) {
          error = e
        }
      })
      expect(error?.message).toBe('Geçersiz dosya formatı')
    })
  })

  // Persistence
  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useUserPrefs())
    act(() => { result.current.toggleFavRoute('15F') })
    const stored = JSON.parse(localStorage.getItem('iett-prefs') ?? '{}') as { favRoutes: string[] }
    expect(stored.favRoutes).toContain('15F')
  })
})
