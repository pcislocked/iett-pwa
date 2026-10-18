import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWakeLock } from '../useWakeLock'

describe('useWakeLock', () => {
  let releaseMock: ReturnType<typeof vi.fn>
  let requestMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    releaseMock = vi.fn().mockResolvedValue(undefined)
    requestMock = vi.fn().mockResolvedValue({
      released: false,
      release: releaseMock,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    // Mock navigator.wakeLock
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: requestMock },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('reports isSupported=true when wakeLock exists in navigator', () => {
    const { result } = renderHook(() => useWakeLock({ enabled: false }))
    expect(result.current.isSupported).toBe(true)
    expect(result.current.isLocked).toBe(false)
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('requests screen wake lock when enabled=true', async () => {
    const { result } = renderHook(() => useWakeLock({ enabled: true }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(requestMock).toHaveBeenCalledWith('screen')
    expect(result.current.isLocked).toBe(true)
  })

  it('releases wake lock automatically after 30-minute hard timeout', async () => {
    renderHook(() => useWakeLock({ enabled: true, timeoutMs: 30 * 60 * 1000 }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(requestMock).toHaveBeenCalled()
    expect(releaseMock).not.toHaveBeenCalled()

    // Fast-forward 30 minutes
    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000)
      await Promise.resolve()
    })

    expect(releaseMock).toHaveBeenCalled()
  })

  it('releases lock and cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock({ enabled: true }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(requestMock).toHaveBeenCalled()

    await act(async () => {
      unmount()
      await Promise.resolve()
    })
    expect(releaseMock).toHaveBeenCalled()
  })

  it('does not crash if navigator.wakeLock throws an error', async () => {
    requestMock.mockRejectedValueOnce(new Error('NotAllowedError'))
    const { result } = renderHook(() => useWakeLock({ enabled: true }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.isLocked).toBe(false)
  })
})
