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

describe('formatCompactRelativeTime and formatGpsTimestamp styles', () => {
  const baseTime = new Date('2026-07-27T12:00:00').getTime()

  it('formats compact relative times correctly', async () => {
    const { formatCompactRelativeTime, formatGpsTimestamp } = await import('../dateUtils')
    
    expect(formatCompactRelativeTime(baseTime - 4000, baseTime)).toBe('-4s')
    expect(formatCompactRelativeTime(baseTime - 120_000, baseTime)).toBe('-2m')
    expect(formatCompactRelativeTime(baseTime - 3600_000, baseTime)).toBe('-1h')
    expect(formatCompactRelativeTime(baseTime + 1000, baseTime)).toBe('-0s')

    const mockT = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'map.secondsAgo') return `${opts?.seconds} sn önce`
      return key
    }

    // formatGpsTimestamp with style
    const ts = '11:59:56' // 4 seconds before 12:00:00
    const compactFormatted = formatGpsTimestamp(ts, 'relative', mockT, baseTime, 'compact')
    expect(compactFormatted).toBe('-4s')

    const standardFormatted = formatGpsTimestamp(ts, 'relative', mockT, baseTime, 'standard')
    expect(standardFormatted).toBe('4 sn önce')

    const emojiFormatted = formatGpsTimestamp(ts, 'relative', mockT, baseTime, 'emoji')
    expect(emojiFormatted).toBe('-4s')
  })
})

