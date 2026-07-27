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
