import { describe, it, expect, vi, afterEach } from 'vitest'
import { isIOSDevice } from '../platform'

describe('isIOSDevice', () => {
  const originalNavigator = window.navigator

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
  })

  it('detects iPhone userAgent', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    })
    expect(isIOSDevice()).toBe(true)
  })

  it('detects iPadOS 13+ (MacIntel with maxTouchPoints > 1)', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    })
    expect(isIOSDevice()).toBe(true)
  })

  it('returns false for Android devices', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    })
    expect(isIOSDevice()).toBe(false)
  })

  it('returns false for desktop Mac without touch', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      },
      configurable: true,
      writable: true,
    })
    expect(isIOSDevice()).toBe(false)
  })
})
