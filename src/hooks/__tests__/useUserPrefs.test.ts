import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUserPrefs } from '../useUserPrefs'

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

    it('enforces a max of 4 pinned stops', () => {
      const { result } = renderHook(() => useUserPrefs())
      act(() => {
        result.current.pinStop('s1', 'A')
        result.current.pinStop('s2', 'B')
        result.current.pinStop('s3', 'C')
        result.current.pinStop('s4', 'D')
        result.current.pinStop('s5', 'E')  // should be ignored
      })
      expect(result.current.prefs.pinnedStops).toHaveLength(4)
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
})
