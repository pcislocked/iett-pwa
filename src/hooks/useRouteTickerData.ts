import { useMemo } from 'react'
import { usePolling } from './usePolling'
import { api, type ScheduledDeparture, type RouteMetadata } from '@/api/client'

type CacheEntry = { schedule: ScheduledDeparture[]; metadata: RouteMetadata[] | null }

// In-memory cache: code → { data, timestamp }
const routeCache = new Map<string, { data: CacheEntry; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Hook to fetch route schedule + metadata with deduplication.
 * Multiple components requesting the same route code will share a single fetch
 * and refresh cycle, reducing network load.
 */
export function useRouteTickerData(code: string) {
  const fetcher = useMemo(
    () => () => {
      const now = Date.now()
      const cached = routeCache.get(code)
      
      // Return cached data if still fresh
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return Promise.resolve(cached.data)
      }

      // Fetch fresh data
      return Promise.all([api.routes.schedule(code), api.routes.metadata(code)])
        .then(([schedule, metadata]): CacheEntry => {
          const data = { schedule, metadata }
          routeCache.set(code, { data, timestamp: now })
          return data
        })
        .catch((err) => {
          // On error, keep cached data alive if available
          if (cached) {
            routeCache.set(code, { data: cached.data, timestamp: now })
            return cached.data
          }
          throw err
        })
    },
    [code],
  )

  // Poll every 5 minutes; reuses cache during interval
  const { data, loading } = usePolling(fetcher, 300_000)
  return { data, loading }
}

