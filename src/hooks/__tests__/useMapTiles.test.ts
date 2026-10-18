import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapTiles, TILE_URLS, TILE_ATTRIBUTION } from '../useMapTiles'
import { applyTheme } from '../useTheme'

describe('useMapTiles hook', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('initializes with default dark base map and classes', () => {
    const { result } = renderHook(() => useMapTiles())

    expect(result.current.satellite).toBe(false)
    expect(result.current.currentUrl).toBe(TILE_URLS.dark)
    expect(result.current.currentAttribution).toBe(TILE_ATTRIBUTION.esri)
    expect(result.current.mapClassName).toBe('map-base')
    expect(result.current.tileClassName).toBe('leaflet-tiles-base')
  })

  it('switches tile URL when theme is light', () => {
    act(() => {
      applyTheme('light')
    })

    const { result } = renderHook(() => useMapTiles())
    expect(result.current.currentUrl).toBe(TILE_URLS.light)
    expect(result.current.mapClassName).toBe('map-base')
    expect(result.current.tileClassName).toBe('leaflet-tiles-base')
  })

  it('toggles satellite mode on and off and updates classes and storage', () => {
    const { result } = renderHook(() => useMapTiles())

    act(() => {
      result.current.toggleSatellite()
    })

    expect(result.current.satellite).toBe(true)
    expect(result.current.currentUrl).toBe(TILE_URLS.satellite)
    expect(result.current.currentAttribution).toBe(TILE_ATTRIBUTION.satellite)
    expect(result.current.mapClassName).toBe('map-satellite')
    expect(result.current.tileClassName).toBe('leaflet-tiles-satellite')
    expect(localStorage.getItem('map-satellite')).toBe('1')

    act(() => {
      result.current.toggleSatellite()
    })

    expect(result.current.satellite).toBe(false)
    expect(result.current.currentUrl).toBe(TILE_URLS.dark)
    expect(result.current.mapClassName).toBe('map-base')
    expect(result.current.tileClassName).toBe('leaflet-tiles-base')
    expect(localStorage.getItem('map-satellite')).toBe('0')
  })

  it('initializes in satellite mode when stored in localStorage', () => {
    localStorage.setItem('map-satellite', '1')

    const { result } = renderHook(() => useMapTiles())
    expect(result.current.satellite).toBe(true)
    expect(result.current.currentUrl).toBe(TILE_URLS.satellite)
    expect(result.current.mapClassName).toBe('map-satellite')
    expect(result.current.tileClassName).toBe('leaflet-tiles-satellite')
  })
})
