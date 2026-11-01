import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sanitizeApiBase, loadSettings, SETTINGS_KEY } from '@/utils/settings'
import { cleanupReloadQueryParams, clearOriginCaches } from '@/utils/appUpdate'

describe('Security & PWA Update Hardening', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('rejects credentials in apiBase URLs', () => {
    expect(sanitizeApiBase('https://user:pass@example.com')).toBe('')
  })

  it('strips query parameters and hashes from apiBase', () => {
    expect(sanitizeApiBase('https://api.example.com/v1/?foo=bar#baz')).toBe('https://api.example.com/v1')
  })

  it('sanitizes tampered localStorage apiBase on loadSettings()', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ apiBase: 'javascript:alert(1)' }))
    expect(loadSettings().apiBase).toBe('')
  })

  it('cleanupReloadQueryParams strips ?v= and &reload= from window URL', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState')
    window.history.pushState({}, '', '/?v=0.4.12.3&reload=1700000000&keep=1#section')
    cleanupReloadQueryParams()
    expect(replaceSpy).toHaveBeenCalledWith(expect.anything(), '', '/?keep=1#section')
    replaceSpy.mockRestore()
  })

  it('cleanupReloadQueryParams preserves non-update query parameters and URL hash', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState')
    window.history.pushState({}, '', '/routes?route=500T&v=0.4.12.3&direction=G&reload=123#map')
    cleanupReloadQueryParams()
    expect(replaceSpy).toHaveBeenCalledWith(expect.anything(), '', '/routes?route=500T&direction=G#map')
    replaceSpy.mockRestore()
  })

  it('blocks remote http endpoints when running under https origin', () => {
    const origLocation = window.location
    try {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...origLocation, protocol: 'https:' },
      })
      expect(sanitizeApiBase('http://remote-api.example.com')).toBe('')
      expect(sanitizeApiBase('http://192.168.1.100:8000')).toBe('')
    } finally {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: origLocation,
      })
    }
  })

  it('allows localhost, 127.0.0.1, and [::1] under https origin', () => {
    const origLocation = window.location
    try {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...origLocation, protocol: 'https:' },
      })
      expect(sanitizeApiBase('http://localhost:8000')).toBe('http://localhost:8000')
      expect(sanitizeApiBase('http://127.0.0.1:8000')).toBe('http://127.0.0.1:8000')
      expect(sanitizeApiBase('http://[::1]:8000')).toBe('http://[::1]:8000')
      expect(sanitizeApiBase('https://api.iett.istanbul')).toBe('https://api.iett.istanbul')
    } finally {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: origLocation,
      })
    }
  })

  it('preserves clean relative paths', () => {
    expect(sanitizeApiBase('/api/v1/')).toBe('/api/v1')
    expect(sanitizeApiBase('//invalid-protocol-relative')).toBe('')
  })

  it('clearOriginCaches preserves cache keys starting with workbox-precache and deletes others', async () => {
    const deletedKeys: string[] = []
    const mockCacheKeys = ['workbox-precache-v2-https://iett.app/', 'iett-api', 'map-tiles-v2']

    const mockCaches = {
      keys: vi.fn().mockResolvedValue(mockCacheKeys),
      delete: vi.fn().mockImplementation((key: string) => {
        deletedKeys.push(key)
        return Promise.resolve(true)
      }),
    }

    vi.stubGlobal('caches', mockCaches)

    try {
      await clearOriginCaches()
      expect(deletedKeys).toContain('iett-api')
      expect(deletedKeys).toContain('map-tiles-v2')
      expect(deletedKeys).not.toContain('workbox-precache-v2-https://iett.app/')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
