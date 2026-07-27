/**
 * Date and timestamp utility functions.
 */

/**
 * Returns true if the bus's last_seen_ts is older than 5 minutes (300,000 ms) relative to reference time (now).
 */
export function isGpsStale(lastSeenTs: string | null | undefined, nowMs: number = Date.now()): boolean {
  if (!lastSeenTs) return false
  const trimmed = String(lastSeenTs).trim()
  if (!trimmed) return false

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
    if (dateObj.getTime() - nowMs > 300_000) {
      dateObj.setDate(dateObj.getDate() - 1)
    }
  }

  if (!dateObj) return false
  const diffMs = nowMs - dateObj.getTime()
  return diffMs > 300_000
}
