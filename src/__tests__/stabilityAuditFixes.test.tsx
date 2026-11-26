import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import SafeMarkdown from '@/components/SafeMarkdown'
import { api } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { useMapTiles } from '@/hooks/useMapTiles'
import { addRecent, clearRecent, getRecent } from '@/hooks/useRecentSearches'
import {
  CHUNK_RELOAD_KEY,
  lazyWithRetry,
  tryGuardedChunkReload,
} from '@/utils/lazyWithRetry'
import { saveSettings } from '@/utils/settings'

function BombComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('render boom')
  }
  return <div>Recovered Content</div>
}

describe('Phase 2 stability & crash audit fixes', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('ErrorBoundary catches render errors, shows fallback, and resets when resetKey changes', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <ErrorBoundary resetKey="/settings">
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sayfayı Yenile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ana Sayfaya Dön/i })).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="/home">
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Recovered Content')).toBeInTheDocument()
    errSpy.mockRestore()
  })

  it('lazyWithRetry and tryGuardedChunkReload perform guarded one-time reload and stop on repeat', async () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      configurable: true,
    })

    expect(tryGuardedChunkReload()).toBe(true)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeTruthy()

    // Second attempt in same session must not infinite-loop reload
    expect(tryGuardedChunkReload()).toBe(false)
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    // Blocked sessionStorage must return false safely without throwing
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    expect(tryGuardedChunkReload()).toBe(false)

    // Loaded chunk clears reload flag
    vi.restoreAllMocks()
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '123')
    const LazyOk = lazyWithRetry(async () => ({ default: () => <div>Chunk Loaded</div> }))
    render(<LazyOk />)
    await waitFor(() => {
      expect(screen.getByText('Chunk Loaded')).toBeInTheDocument()
    })
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull()
  })

  it('api/client rethrows AbortError without fallback retry or wrapping into network error', async () => {
    saveSettings({ apiBase: 'https://custom.example', refreshInterval: 20, autoLocate: false })
    const abortErr = new DOMException('Aborted', 'AbortError')
    const fetchMock = vi.fn().mockRejectedValue(abortErr)
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.fleet.meta()).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('api/client falls back when AbortSignal.any is missing and combines user abort with timeout', async () => {
    const originalAny = AbortSignal.any
    Object.defineProperty(AbortSignal, 'any', { value: undefined, configurable: true })

    try {
      const controller = new AbortController()
      const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
        expect(init?.signal).toBeDefined()
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const promise = api.fleet.meta({ signal: controller.signal })
      controller.abort()
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    } finally {
      Object.defineProperty(AbortSignal, 'any', { value: originalAny, configurable: true })
    }
  })

  it('handles corrupt/non-array and blocked localStorage cleanly across favorites, recents, and map tiles', () => {
    localStorage.setItem('iett_favorites', 'null')
    localStorage.setItem('iett_recent', '{"not": "an array"}')

    const { result: favRes } = renderHook(() => useFavorites())
    expect(favRes.current.favorites).toEqual([])
    expect(getRecent()).toEqual([])

    localStorage.setItem('iett_favorites', JSON.stringify([{ bad: true }, { kind: 'stop', dcode: '100', name: 'Valid' }]))
    const { result: favRes2 } = renderHook(() => useFavorites())
    expect(favRes2.current.favorites).toEqual([{ kind: 'stop', dcode: '100', name: 'Valid' }])

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError')
    })

    expect(() => addRecent({ kind: 'stop', code: '100', name: 'X' })).not.toThrow()
    expect(() => clearRecent()).not.toThrow()
    const { result: tileRes } = renderHook(() => useMapTiles())
    expect(tileRes.current.satellite).toBe(false)
    expect(() => tileRes.current.toggleSatellite()).not.toThrow()
  })

  it('SafeMarkdown rejects protocol-relative // links instead of treating them as internal routes', () => {
    render(
      <MemoryRouter>
        <SafeMarkdown content="Check [phish](//evil.example/steal) and [home](/search)" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: /phish/i })).not.toBeInTheDocument()
    expect(screen.getByText(/phish/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/search')
  })
})
