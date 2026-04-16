import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('useSharedRouteTickerNowMs', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('ticks on next minute boundary and then every minute', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date('2026-01-01T12:00:37.000Z'))

    vi.resetModules()
    const { useSharedRouteTickerNowMs } = await import('../useSharedRouteTickerClock')

    const { result, unmount } = renderHook(() => useSharedRouteTickerNowMs())
    expect(result.current).toBe(Date.now())

    const initial = result.current

    act(() => {
      vi.advanceTimersByTime(22_000)
    })
    expect(result.current).toBe(initial)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current).toBe(Date.now())

    const afterBoundary = result.current

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current).toBe(Date.now())
    expect(result.current).not.toBe(afterBoundary)

    unmount()
  })
})
