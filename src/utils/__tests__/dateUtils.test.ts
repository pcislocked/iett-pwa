import { describe, it, expect } from 'vitest'
import { isGpsStale } from '../dateUtils'

describe('isGpsStale', () => {
  const baseTime = new Date('2026-07-27T21:18:00').getTime()

  it('returns false for null or undefined', () => {
    expect(isGpsStale(null, baseTime)).toBe(false)
    expect(isGpsStale(undefined, baseTime)).toBe(false)
    expect(isGpsStale('', baseTime)).toBe(false)
  })

  it('returns false for recent GPS timestamp (< 5 min old)', () => {
    expect(isGpsStale('21:16:00', baseTime)).toBe(false)
    expect(isGpsStale('21:14:00', baseTime)).toBe(false)
  })

  it('returns true for old GPS timestamp (> 5 min old)', () => {
    expect(isGpsStale('21:10:00', baseTime)).toBe(true)
    expect(isGpsStale('20:50:00', baseTime)).toBe(true)
  })

  it('handles ISO / full datetime strings', () => {
    expect(isGpsStale('2026-07-27T21:16:00', baseTime)).toBe(false)
    expect(isGpsStale('2026-07-27T21:10:00', baseTime)).toBe(true)
  })

  it('returns false for invalid date strings', () => {
    expect(isGpsStale('invalid-date', baseTime)).toBe(false)
  })
})
