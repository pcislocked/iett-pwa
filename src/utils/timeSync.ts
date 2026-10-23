import { api } from '@/api/client'

let cachedServerOffsetMs: number | null = null
let syncPromise: Promise<number | null> | null = null

/**
 * Synchronize server clock using SNTP midpoint algorithm.
 * Accounts for network Round Trip Time (RTT).
 */
export async function syncServerTime(init?: RequestInit): Promise<number | null> {
  if (syncPromise) {
    return syncPromise
  }

  syncPromise = (async () => {
    try {
      const t0 = Date.now()
      const res = await api.system?.time(init)
      const t1 = Date.now()

      if (!res) {
        return cachedServerOffsetMs
      }

      let serverEpochMs: number
      if (typeof res.timestamp_ms === 'number' && !Number.isNaN(res.timestamp_ms)) {
        serverEpochMs = res.timestamp_ms
      } else if (res.iso) {
        const parsed = Date.parse(res.iso)
        serverEpochMs = Number.isNaN(parsed)
          ? (typeof res.timestamp === 'number' ? res.timestamp * 1000 : Date.now())
          : parsed
      } else if (typeof res.timestamp === 'number') {
        serverEpochMs = res.timestamp * 1000
      } else if (typeof res.time === 'string') {
        const parts = res.time.split(':').map(Number)
        const d = new Date()
        d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0)
        serverEpochMs = d.getTime()
      } else {
        serverEpochMs = Date.now()
      }

      // SNTP Midpoint calculation:
      // t0 = client request dispatch time
      // t1 = client response arrival time
      // RTT = t1 - t0
      // clientMidpoint = t0 + (RTT / 2)
      // offset = serverEpochMs - clientMidpoint
      const rtt = Math.max(0, t1 - t0)
      const clientMidpoint = t0 + rtt / 2
      const offset = Math.round(serverEpochMs - clientMidpoint)

      cachedServerOffsetMs = offset
      return offset
    } catch (err) {
      console.warn('Failed to sync server time:', err)
      return cachedServerOffsetMs
    } finally {
      syncPromise = null
    }
  })()

  return syncPromise
}

export function getServerOffsetMs(): number | null {
  return cachedServerOffsetMs
}

export function resetServerOffsetForTesting(): void {
  cachedServerOffsetMs = null
  syncPromise = null
}
