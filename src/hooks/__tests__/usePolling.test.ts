import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { usePolling } from '../usePolling'

describe('usePolling', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts loading and fetches immediately on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3])
    const { result } = renderHook(() => usePolling(fetcher, 5_000))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([1, 2, 3])
    expect(result.current.error).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('re-fetches on each interval tick', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const fetcher = vi.fn().mockResolvedValue('fresh')
    renderHook(() => usePolling(fetcher, 5_000))

    // flush the first fetch (microtask + state update)
    await act(async () => { await Promise.resolve() })
    await act(async () => { await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(2)

    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('sets error and marks data stale on failed fetch', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const fetcher = vi.fn()
      .mockResolvedValueOnce('initial data')
      .mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePolling(fetcher, 5_000))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(result.current.data).toBe('initial data')

    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(result.current.error).toBe('Network error')
    expect(result.current.stale).toBe(true)
    expect(result.current.data).toBe('initial data')  // old data preserved
  })

  it('clears stale flag and error on recovery after a failed fetch', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const fetcher = vi.fn()
      .mockResolvedValueOnce('good')
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValue('recovered')

    const { result } = renderHook(() => usePolling(fetcher, 5_000))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(result.current.data).toBe('good')

    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(result.current.stale).toBe(true)

    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(result.current.stale).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('recovered')
  })

  it('refresh() triggers an immediate re-fetch and sets loading', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const { result } = renderHook(() => usePolling(fetcher, 5_000))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(1)

    act(() => { result.current.refresh() })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not update state after the component unmounts', async () => {
    let resolveFirst!: (v: string) => void
    const fetcher = vi.fn().mockReturnValue(
      new Promise<string>((r) => { resolveFirst = r }),
    )

    const { result, unmount } = renderHook(() => usePolling(fetcher, 5_000))
    expect(result.current.loading).toBe(true)

    // Unmount before the fetch resolves
    unmount()
    await act(async () => { resolveFirst('late data') })

    // State should not have been updated — loading stays true, data stays null
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('discards results from superseded fetches (fetch-ID guard)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    // Slow first fetch, instant second fetch
    let resolveFirst!: (v: string) => void
    const fetcher = vi.fn()
      .mockReturnValueOnce(new Promise<string>((r) => { resolveFirst = r }))
      .mockResolvedValue('fast data')

    const { result } = renderHook(() => usePolling(fetcher, 5_000))

    // Advance timer so the second fetch fires while first is still pending
    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(2)

    // Second fetch resolves first with 'fast data'
    await act(async () => { await Promise.resolve() })
    expect(result.current.data).toBe('fast data')

    // Now the first (slow) fetch resolves — it must be ignored
    await act(async () => { resolveFirst('stale data') })
    expect(result.current.data).toBe('fast data')
  })

  it('records lastUpdated after a successful fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const before = Date.now()

    const { result } = renderHook(() => usePolling(fetcher, 5_000))
    await waitFor(() => expect(result.current.lastUpdated).not.toBeNull(), { timeout: 3_000 })
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
    expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('does not record lastUpdated on error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => usePolling(fetcher, 5_000))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3_000 })
    expect(result.current.lastUpdated).toBeNull()
  })

  it('clears interval on unmount so no further fetches fire', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const fetcher = vi.fn().mockResolvedValue('x')
    const { unmount } = renderHook(() => usePolling(fetcher, 1_000))

    // flush initial fetch
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(1)

    unmount()
    act(() => { vi.advanceTimersByTime(5_000) })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('extracts iettUpdated from __iettUpdated property', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: 'ok',
      __iettUpdated: new Date('2026-05-23T00:00:00Z')
    })
    const { result } = renderHook(() => usePolling(fetcher, 5_000))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.iettUpdated).toBeInstanceOf(Date)
    expect(result.current.iettUpdated!.toISOString()).toBe('2026-05-23T00:00:00.000Z')
  })

  it('clears iettUpdated when subsequent fetch lacks __iettUpdated', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        data: '1',
        __iettUpdated: new Date('2026-05-23T00:00:00Z')
      })
      .mockResolvedValueOnce({
        data: '2'
      })

    const { result } = renderHook(() => usePolling(fetcher, 5_000))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(result.current.iettUpdated).not.toBeNull()

    await act(async () => { vi.advanceTimersByTime(5_000); await Promise.resolve() })
    expect(result.current.iettUpdated).toBeNull()
  })

  it('refetches immediately and sets loading=true when key changes', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const { result, rerender } = renderHook(
      ({ key }) => usePolling(fetcher, 5_000, key),
      { initialProps: { key: 'key1' } }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(1)

    // Change the key
    act(() => {
      rerender({ key: 'key2' })
    })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('cancels any in-flight requests of the previous key when key changes', async () => {
    let resolveFirst!: (v: string) => void
    const fetcher = vi.fn()
      .mockReturnValueOnce(new Promise<string>((r) => { resolveFirst = r }))
      .mockResolvedValueOnce('second-key-data')

    const { result, rerender } = renderHook(
      ({ key }) => usePolling(fetcher, 5_000, key),
      { initialProps: { key: 'key1' } }
    )

    expect(result.current.loading).toBe(true)

    // Change the key before the first fetch resolves
    act(() => {
      rerender({ key: 'key2' })
    })

    // Wait for the second key fetch to resolve
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe('second-key-data')

    // Resolve the first key fetch - it should be ignored
    await act(async () => {
      resolveFirst('stale-key1-data')
    })
    expect(result.current.data).toBe('second-key-data')
  })
})

