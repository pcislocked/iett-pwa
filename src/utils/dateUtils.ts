/**
 * Date and timestamp utility functions.
 */

export const STALE_GPS_THRESHOLD_MS = 300_000 // 5 minutes
export const FUTURE_GPS_TOLERANCE_MS = 60_000 // 1 minute

/**
 * Parses a GPS timestamp string (HH:mm:ss, ISO, YYYY-MM-DD HH:mm:ss) into a Date object.
 * Adjusts day boundary if the time is in the future beyond tolerance (due to midnight rollover).
 */
export function parseGpsTimestamp(
  lastSeenTs: string | null | undefined,
  nowMs: number = Date.now(),
  futureToleranceMs: number = FUTURE_GPS_TOLERANCE_MS
): Date | null {
  if (!lastSeenTs) return null
  const trimmed = String(lastSeenTs).trim()
  if (!trimmed) return null

  let dateObj: Date | null = null

  // Check for Turkish DD-MM-YYYY or DD.MM.YYYY format (e.g. "14-10-2026 08:23:57")
  const dmyMatch = trimmed.match(/^(\d{2})[-./](\d{2})[-./](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const hour = parseInt(dmyMatch[4] || '0', 10)
    const min = parseInt(dmyMatch[5] || '0', 10)
    const sec = parseInt(dmyMatch[6] || '0', 10)
    const parsed = new Date(year, month, day, hour, min, sec)
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed
    }
  } else if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.includes(':'))) {
    const parsed = new Date(trimmed.replace(' ', 'T'))
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed
    }
  } else if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const refDate = new Date(nowMs)
    const [h, m, s] = trimmed.split(':').map(Number)
    dateObj = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), h, m, s)
    if (dateObj.getTime() - nowMs > futureToleranceMs) {
      dateObj.setDate(dateObj.getDate() - 1)
    }
  }

  return dateObj && !isNaN(dateObj.getTime()) ? dateObj : null
}

/**
 * Returns true if the bus's last_seen_ts is older than 5 minutes relative to reference time (now).
 */
export function isGpsStale(
  lastSeenTs: string | null | undefined,
  nowMs: number = Date.now(),
  staleThresholdMs: number = STALE_GPS_THRESHOLD_MS
): boolean {
  const dateObj = parseGpsTimestamp(lastSeenTs, nowMs)
  if (!dateObj) return false
  const diffMs = nowMs - dateObj.getTime()
  return diffMs > staleThresholdMs
}

/**
 * Formats a timestamp into a compact relative string (e.g. "-4s", "-2m", "-1h").
 */
export function formatCompactRelativeTime(
  lastSeenTs: string | number | Date | null | undefined,
  nowMs: number = Date.now()
): string {
  if (lastSeenTs === null || lastSeenTs === undefined || lastSeenTs === '') return '-'
  let dateObj: Date | null = null
  if (typeof lastSeenTs === 'number') {
    dateObj = new Date(lastSeenTs)
  } else if (lastSeenTs instanceof Date) {
    dateObj = lastSeenTs
  } else {
    dateObj = parseGpsTimestamp(lastSeenTs, nowMs)
  }
  if (!dateObj || isNaN(dateObj.getTime())) return '-'

  const diffMs = Math.max(0, nowMs - dateObj.getTime())
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 60) {
    return `-${diffSeconds || 0}s`
  } else if (diffMinutes < 60) {
    return `-${diffMinutes}m`
  } else if (diffHours < 24) {
    return `-${diffHours}h`
  }
  return '>1d'
}

/**
 * Formats a timestamp string according to user preferences: 'relative', 'absolute', or 'both'.
 * Supports 'standard', 'compact', and 'emoji' styles.
 */
export function formatGpsTimestamp(
  lastSeenTs: string | null | undefined,
  mode: 'relative' | 'absolute' | 'both',
  t: (key: string, opts?: Record<string, unknown>) => string,
  nowMs: number = Date.now(),
  style: 'standard' | 'compact' | 'emoji' = 'standard'
): string {
  if (!lastSeenTs) return '-'
  const trimmed = String(lastSeenTs).trim()
  if (!trimmed) return '-'
  
  const dateObj = parseGpsTimestamp(trimmed, nowMs)
  if (!dateObj) return trimmed // Fallback to raw if unparseable

  const pad = (n: number) => n.toString().padStart(2, '0')
  const absStr = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`

  if (mode === 'absolute') return absStr

  let relativeStr = ''
  if (style === 'compact' || style === 'emoji') {
    relativeStr = formatCompactRelativeTime(trimmed, nowMs)
  } else {
    const diffMs = Math.max(0, nowMs - dateObj.getTime())
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    
    if (diffSeconds < 100) {
      relativeStr = t('map.secondsAgo', { defaultValue: '{{seconds}} sn önce', seconds: diffSeconds || 1 })
    } else if (diffMinutes < 100) {
      relativeStr = t('map.minutesAgo', { defaultValue: '{{minutes}} dk önce', minutes: diffMinutes })
    } else if (diffHours < 24) {
      relativeStr = t('map.hoursAgo', { defaultValue: '{{hours}} sa önce', hours: diffHours })
    } else {
      relativeStr = t('common.outdated', { defaultValue: 'Güncel değil' })
    }
  }

  if (mode === 'relative') return relativeStr
  return `${relativeStr} - ${absStr}`
}

const TURKISH_MONTHS = [
  'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
  'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'
]

/**
 * Checks whether an announcement date string corresponds to today's date.
 * Supports Turkish month names ("18 Ekim 2026"), numeric DD.MM.YYYY / DD-MM-YYYY, and ISO YYYY-MM-DD.
 */
export function isTodayAnnouncement(dateStr?: string | null, now: Date = new Date()): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false
  const raw = dateStr.trim().toLocaleLowerCase('tr-TR')
  if (!raw) return false

  const day = now.getDate()
  const monthIdx = now.getMonth() // 0-11
  const monthNum = monthIdx + 1
  const year = now.getFullYear()
  const monthName = TURKISH_MONTHS[monthIdx]

  // Check 1: Turkish textual date: e.g. "18 Ekim 2026" or "18 Ekim"
  const dayMatch = new RegExp(`(^|\\D)0?${day}(\\D|$)`).test(raw)
  if (dayMatch && raw.includes(monthName)) {
    const yearMatch = raw.match(/\b(20\d{2})\b/)
    if (!yearMatch || parseInt(yearMatch[1], 10) === year) {
      return true
    }
  }

  // Check 2: Numeric date: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const numericMatch = raw.match(/(^|\D)0?(\d{1,2})[./-]0?(\d{1,2})([./-](\d{4}))?(\D|$)/)
  if (numericMatch) {
    const d = parseInt(numericMatch[2], 10)
    const m = parseInt(numericMatch[3], 10)
    const y = numericMatch[5] ? parseInt(numericMatch[5], 10) : year
    if (d === day && m === monthNum && y === year) {
      return true
    }
  }

  // Check 3: ISO YYYY-MM-DD
  const isoPrefix = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (raw.includes(isoPrefix)) {
    return true
  }

  return false
}
