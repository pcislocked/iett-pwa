import { useMemo } from 'react'
import { usePolling } from './usePolling'
import { api, type ScheduledDeparture, type RouteMetadata } from '@/api/client'

type CacheEntry = { schedule: ScheduledDeparture[]; metadata: RouteMetadata[] | null }
type CacheRecord = { data: CacheEntry; timestamp: number; lastAccess: number }

// In-memory cache: code → { data, timestamp }
const routeCache = new Map<string, CacheRecord>()
const routeInFlight = new Map<string, Promise<CacheEntry>>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_MAX_ENTRIES = 120

function pruneRouteCache(now: number) {
  for (const [key, record] of routeCache.entries()) {
    if (now - record.timestamp >= CACHE_TTL) routeCache.delete(key)
  }
  if (routeCache.size <= CACHE_MAX_ENTRIES) return

  const oldestFirst = [...routeCache.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess)
  const overflow = routeCache.size - CACHE_MAX_ENTRIES
  for (let i = 0; i < overflow; i++) {
    routeCache.delete(oldestFirst[i][0])
  }
}

/**
 * Hook to fetch route schedule + metadata with in-flight deduplication.
 * Multiple components requesting the same route code share active requests and
 * recently fetched responses.
 */
export function useRouteTickerData(code: string) {
  const fetcher = useMemo(
    () => () => {
      const now = Date.now()
      pruneRouteCache(now)
      const cached = routeCache.get(code)

      // Return cached data if still fresh
      if (cached && now - cached.timestamp < CACHE_TTL) {
        cached.lastAccess = now
        return Promise.resolve(cached.data)
      }

      // Reuse in-flight request for this code
      const inflight = routeInFlight.get(code)
      if (inflight) return inflight

      // Fetch fresh data
      const request = Promise.all([api.routes.schedule(code), api.routes.metadata(code)])
        .then(([schedule, metadata]): CacheEntry => {
          const ts = Date.now()
          const data = { schedule, metadata }
          routeCache.set(code, { data, timestamp: ts, lastAccess: ts })
          pruneRouteCache(ts)
          return data
        })
        .catch((err) => {
          // On error, keep cached data alive if available
          if (cached) {
            routeCache.set(code, { data: cached.data, timestamp: now, lastAccess: now })
            return cached.data
          }
          throw err
        })
        .finally(() => {
          routeInFlight.delete(code)
        })

      routeInFlight.set(code, request)
      return request
    },
    [code],
  )

  // Poll every 5 minutes; reuses cache during interval
  const { data, loading } = usePolling(fetcher, 300_000)
  return { data, loading }
}

