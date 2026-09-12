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

  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.includes(':'))) {
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
 * Formats a timestamp string according to user preferences: 'relative', 'absolute', or 'both'.
 */
export function formatGpsTimestamp(
  lastSeenTs: string | null | undefined,
  mode: 'relative' | 'absolute' | 'both',
  t: (key: string, opts?: Record<string, unknown>) => string,
  nowMs: number = Date.now()
): string {
  if (!lastSeenTs) return '-'
  const trimmed = String(lastSeenTs).trim()
  if (!trimmed) return '-'
  
  const dateObj = parseGpsTimestamp(trimmed, nowMs)
  if (!dateObj) return trimmed // Fallback to raw if unparseable

  const pad = (n: number) => n.toString().padStart(2, '0')
  const absStr = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`

  if (mode === 'absolute') return absStr

  const diffMs = Math.max(0, nowMs - dateObj.getTime())
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  let relativeStr = ''
  if (diffSeconds < 100) {
    relativeStr = t('map.secondsAgo', { defaultValue: '{{seconds}} sn önce', seconds: diffSeconds || 1 })
  } else if (diffMinutes < 100) {
    relativeStr = t('map.minutesAgo', { defaultValue: '{{minutes}} dk önce', minutes: diffMinutes })
  } else if (diffHours < 24) {
    relativeStr = t('map.hoursAgo', { defaultValue: '{{hours}} sa önce', hours: diffHours })
  } else {
    relativeStr = t('common.outdated', { defaultValue: 'Güncel değil' })
  }

  if (mode === 'relative') return relativeStr
  return `${relativeStr} - ${absStr}`
}
