import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useVersionBanner,
  LAST_SEEN_VERSION_KEY,
  normalizeVersion,
  readStoredVersionSafe,
  writeStoredVersionSafe,
  ensureCurrentVersionStored,
} from '../useVersionBanner'

describe('useVersionBanner and storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('normalizeVersion', () => {
    it('strips leading v/V and trims whitespace', () => {
      expect(normalizeVersion('v0.4.11')).toBe('0.4.11')
      expect(normalizeVersion('V0.4.11.1')).toBe('0.4.11.1')
      expect(normalizeVersion('  0.4.11  ')).toBe('0.4.11')
      expect(normalizeVersion(null)).toBe('')
      expect(normalizeVersion(undefined)).toBe('')
    })
  })

  describe('storage safe methods', () => {
    it('readStoredVersionSafe returns value when available', () => {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.4.10')
      const result = readStoredVersionSafe()
      expect(result).toEqual({ ok: true, value: '0.4.10' })
    })

    it('readStoredVersionSafe returns ok:true, value:null when key missing', () => {
      const result = readStoredVersionSafe()
      expect(result).toEqual({ ok: true, value: null })
    })

    it('readStoredVersionSafe handles exceptions gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: Access is denied')
      })
      const result = readStoredVersionSafe()
      expect(result).toEqual({ ok: false, value: null })
    })

    it('writeStoredVersionSafe handles exceptions gracefully', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      const success = writeStoredVersionSafe('0.4.11')
      expect(success).toBe(false)
    })

    it('ensureCurrentVersionStored saves version if missing', () => {
      ensureCurrentVersionStored()
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBeTruthy()
    })
  })

  describe('useVersionBanner hook', () => {
    it('first visit on general versions: stores current version and does NOT show banner', async () => {
      const appUpdate = await import('../../utils/appUpdate')
      vi.spyOn(appUpdate, 'getCurrentAppVersion').mockReturnValue('0.4.13')

      const { result } = renderHook(() => useVersionBanner(true))

      expect(result.current.isVisible).toBe(false)
      expect(result.current.transition).toBeNull()
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe('0.4.13')
    })

    it('first visit on v0.4.12.1: shows banner so existing users discover changelog', async () => {
      const appUpdate = await import('../../utils/appUpdate')
      vi.spyOn(appUpdate, 'getCurrentAppVersion').mockReturnValue('0.4.12.1')

      const { result } = renderHook(() => useVersionBanner(true))

      expect(result.current.isVisible).toBe(true)
      expect(result.current.transition?.oldVersion).toBe('0.4.12')
      expect(result.current.transition?.newVersion).toBe('0.4.12.1')
    })

    it('same version: does not show banner', async () => {
      const appUpdate = await import('../../utils/appUpdate')
      const current = appUpdate.getCurrentAppVersion()
      localStorage.setItem(LAST_SEEN_VERSION_KEY, current)

      const { result } = renderHook(() => useVersionBanner(true))
      expect(result.current.isVisible).toBe(false)
      expect(result.current.transition).toBeNull()
    })

    it('version updated: shows banner with old and new versions', () => {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.4.10')

      const { result } = renderHook(() => useVersionBanner(true))

      expect(result.current.isVisible).toBe(true)
      expect(result.current.transition).not.toBeNull()
      expect(result.current.transition?.oldVersion).toBe('0.4.10')
      expect(result.current.transition?.newVersion).toBeTruthy()
    })

    it('version updated but user disabled banner in preferences: does not show banner', () => {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.4.10')

      const { result } = renderHook(() => useVersionBanner(false))

      expect(result.current.isVisible).toBe(false)
      expect(result.current.transition).toBeNull()
      // Silently updated stored version
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).not.toBe('0.4.10')
    })

    it('dismissBanner writes new version to storage and hides banner', () => {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.4.10')

      const { result } = renderHook(() => useVersionBanner(true))
      expect(result.current.isVisible).toBe(true)

      act(() => {
        result.current.dismissBanner()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.transition).toBeNull()
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).not.toBe('0.4.10')
    })

    it('handles localStorage errors without throwing or showing banner', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      const { result } = renderHook(() => useVersionBanner(true))
      expect(result.current.isVisible).toBe(false)
      expect(result.current.transition).toBeNull()
    })
  })
})
