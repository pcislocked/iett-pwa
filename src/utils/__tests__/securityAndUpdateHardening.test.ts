import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sanitizeApiBase, loadSettings, SETTINGS_KEY } from '@/utils/settings'
import { cleanupReloadQueryParams } from '@/utils/appUpdate'

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
})
