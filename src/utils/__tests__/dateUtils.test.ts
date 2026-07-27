import { describe, it, expect } from 'vitest'
import { isGpsStale, parseGpsTimestamp } from '../dateUtils'

describe('parseGpsTimestamp', () => {
  const baseTime = new Date('2026-07-27T21:18:00').getTime()

  it('returns null for null, undefined, or empty string', () => {
    expect(parseGpsTimestamp(null, baseTime)).toBeNull()
    expect(parseGpsTimestamp(undefined, baseTime)).toBeNull()
    expect(parseGpsTimestamp('', baseTime)).toBeNull()
  })

  it('parses valid HH:mm:ss timestamps correctly', () => {
    const parsed = parseGpsTimestamp('21:16:00', baseTime)
    expect(parsed).not.toBeNull()
    expect(parsed?.getHours()).toBe(21)
    expect(parsed?.getMinutes()).toBe(16)
  })

  it('adjusts day boundary for midnight rollover / future time beyond tolerance', () => {
    // 00:05:00 relative to 23:58:00 (rolled over to next day)
    const lateNightBase = new Date('2026-07-27T23:58:00').getTime()
    const parsed = parseGpsTimestamp('23:50:00', lateNightBase)
    expect(parsed).not.toBeNull()
    expect(parsed?.getTime()).toBeLessThan(lateNightBase)
  })

  it('returns null for unparseable strings', () => {
    expect(parseGpsTimestamp('invalid', baseTime)).toBeNull()
  })
})

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
