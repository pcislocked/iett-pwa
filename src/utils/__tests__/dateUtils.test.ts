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

  it('parses Turkish DD-MM-YYYY and DD.MM.YYYY format timestamps', () => {
    const parsedDash = parseGpsTimestamp('27-07-2026 21:16:00', baseTime)
    expect(parsedDash).not.toBeNull()
    expect(parsedDash?.getFullYear()).toBe(2026)
    expect(parsedDash?.getMonth()).toBe(6) // 0-indexed: July
    expect(parsedDash?.getDate()).toBe(27)
    expect(parsedDash?.getHours()).toBe(21)
    expect(parsedDash?.getMinutes()).toBe(16)

    const parsedDot = parseGpsTimestamp('27.07.2026 14:30:15', baseTime)
    expect(parsedDot).not.toBeNull()
    expect(parsedDot?.getFullYear()).toBe(2026)
    expect(parsedDot?.getMonth()).toBe(6)
    expect(parsedDot?.getDate()).toBe(27)
    expect(parsedDot?.getHours()).toBe(14)
    expect(parsedDot?.getMinutes()).toBe(30)
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

describe('isTodayAnnouncement', () => {
  const today = new Date(2026, 9, 18) // 18 Ekim 2026

  it('matches Turkish month format for today', async () => {
    const { isTodayAnnouncement } = await import('../dateUtils')
    expect(isTodayAnnouncement('18 Ekim 2026', today)).toBe(true)
    expect(isTodayAnnouncement('18 ekim 2026', today)).toBe(true)
    expect(isTodayAnnouncement('18 EKİM 2026', today)).toBe(true)
    expect(isTodayAnnouncement('18 Ekim', today)).toBe(true)
  })

  it('rejects past or future Turkish month dates', async () => {
    const { isTodayAnnouncement } = await import('../dateUtils')
    expect(isTodayAnnouncement('17 Ekim 2026', today)).toBe(false)
    expect(isTodayAnnouncement('19 Ekim 2026', today)).toBe(false)
    expect(isTodayAnnouncement('18 Eylül 2026', today)).toBe(false)
    expect(isTodayAnnouncement('18 Ekim 2025', today)).toBe(false)
  })

  it('matches numeric dates', async () => {
    const { isTodayAnnouncement } = await import('../dateUtils')
    expect(isTodayAnnouncement('18.10.2026', today)).toBe(true)
    expect(isTodayAnnouncement('18/10/2026', today)).toBe(true)
    expect(isTodayAnnouncement('18-10-2026', today)).toBe(true)
    expect(isTodayAnnouncement('17.10.2026', today)).toBe(false)
  })

  it('matches ISO dates', async () => {
    const { isTodayAnnouncement } = await import('../dateUtils')
    expect(isTodayAnnouncement('2026-10-18', today)).toBe(true)
    expect(isTodayAnnouncement('2026-10-17', today)).toBe(false)
  })

  it('handles null, undefined, and empty string safely', async () => {
    const { isTodayAnnouncement } = await import('../dateUtils')
    expect(isTodayAnnouncement(null, today)).toBe(false)
    expect(isTodayAnnouncement(undefined, today)).toBe(false)
    expect(isTodayAnnouncement('', today)).toBe(false)
    expect(isTodayAnnouncement('invalid string', today)).toBe(false)
  })
})

