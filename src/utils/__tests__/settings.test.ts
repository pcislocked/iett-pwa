import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SETTINGS_KEY, DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/utils/settings'

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default settings when key is absent', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('returns default settings when stored value is invalid JSON', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('merges stored partial values over defaults', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ apiBase: 'https://example.com' }))
    const result = loadSettings()
    expect(result.apiBase).toBe('https://example.com')
    expect(result.refreshInterval).toBe(DEFAULT_SETTINGS.refreshInterval)
    expect(result.autoLocate).toBe(DEFAULT_SETTINGS.autoLocate)
  })

  it('returns a fresh copy of defaults each call (no shared reference)', () => {
    const a = loadSettings()
    const b = loadSettings()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

describe('saveSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes settings as JSON under SETTINGS_KEY', () => {
    const settings = { ...DEFAULT_SETTINGS, apiBase: 'https://example.com', autoLocate: true }
    saveSettings(settings)
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual(settings)
  })

  it('does not throw when localStorage throws (e.g. QuotaExceededError)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
    spy.mockRestore()
  })

  it('round-trips: saved value is readable by loadSettings', () => {
    const settings = { apiBase: 'https://my.server', refreshInterval: 60, autoLocate: true }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })
})
