import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNowTicker } from '../useNowTicker'

describe('useNowTicker hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with current timestamp and advances every interval', () => {
    vi.setSystemTime(10000)
    const { result } = renderHook(() => useNowTicker(1000))

    expect(result.current).toBe(10000)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(11000)

    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(result.current).toBe(13000)
  })

  it('pauses ticking when document is hidden and resumes when visible', () => {
    vi.setSystemTime(20000)
    const { result } = renderHook(() => useNowTicker(1000))

    // Simulate tab backgrounding
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
      vi.advanceTimersByTime(5000)
    })

    // Timestamp should not have ticked while hidden
    expect(result.current).toBe(20000)

    // Simulate tab foregrounding
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Foregrounding updates immediately to current time
    expect(result.current).toBe(25000)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(26000)
  })

  it('does not tick when disabled', () => {
    vi.setSystemTime(50000)
    const { result } = renderHook(() => useNowTicker(1000, false))

    expect(result.current).toBe(50000)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current).toBe(50000)
  })
})
