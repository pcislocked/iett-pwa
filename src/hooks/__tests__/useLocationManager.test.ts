import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useLocationManager, DEFAULT_MOCK_LOCATION } from '../useLocationManager'

describe('useLocationManager Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('respects gpsConsent="denied" without querying navigator.geolocation', () => {
    localStorage.setItem(
      'iett-prefs',
      JSON.stringify({ gpsConsent: 'denied', mockLocation: [41.05, 29.0] })
    )

    const getCurrentPositionMock = vi.fn()
    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useLocationManager())

    act(() => {
      result.current.requestLocation()
    })

    expect(getCurrentPositionMock).not.toHaveBeenCalled()
    expect(result.current.location).toEqual([41.05, 29.0])
    expect(result.current.loading).toBe(false)
  })

  it('updates location with coordinates when geolocation succeeds', () => {
    localStorage.setItem(
      'iett-prefs',
      JSON.stringify({ gpsConsent: 'granted' })
    )

    const getCurrentPositionMock = vi.fn((success) => {
      success({
        coords: {
          latitude: 41.1,
          longitude: 29.1,
        },
      })
    })

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useLocationManager())

    act(() => {
      result.current.requestLocation()
    })

    expect(getCurrentPositionMock).toHaveBeenCalled()
    expect(result.current.location).toEqual([41.1, 29.1])
    expect(result.current.loading).toBe(false)
  })

  it('falls back to mock location after 12-second watchdog timeout', () => {
    localStorage.setItem(
      'iett-prefs',
      JSON.stringify({ gpsConsent: 'granted' })
    )

    // Unresolved geolocation request
    const getCurrentPositionMock = vi.fn(() => {})

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useLocationManager())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.loading).toBe(true)

    act(() => {
      vi.advanceTimersByTime(12000)
    })

    expect(result.current.location).toEqual(DEFAULT_MOCK_LOCATION)
    expect(result.current.loading).toBe(false)
  })
})
