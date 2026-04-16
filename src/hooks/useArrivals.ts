import { useCallback, useMemo, useRef } from 'react'
import { usePolling } from './usePolling'
import { api, type Arrival } from '@/api/client'

type ArrivalsCacheRecord = { data: Arrival[]; timestamp: number; lastAccess: number }

const arrivalsCache = new Map<string, ArrivalsCacheRecord>()
const arrivalsInFlight = new Map<string, Promise<Arrival[]>>()
const ARRIVALS_CACHE_TTL = 20_000
const ARRIVALS_CACHE_MAX_ENTRIES = 240

function makeArrivalsKey(dcode: string, via?: string): string {
  return `${dcode}::${via ?? ''}`
}

function pruneArrivalsCache(now: number) {
  for (const [key, record] of arrivalsCache.entries()) {
    if (now - record.timestamp >= ARRIVALS_CACHE_TTL) arrivalsCache.delete(key)
  }
  if (arrivalsCache.size <= ARRIVALS_CACHE_MAX_ENTRIES) return

  const oldestFirst = [...arrivalsCache.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess)
  const overflow = arrivalsCache.size - ARRIVALS_CACHE_MAX_ENTRIES
  for (let i = 0; i < overflow; i++) {
    arrivalsCache.delete(oldestFirst[i][0])
  }
}

function fetchArrivalsShared(dcode: string, via?: string, forceNetwork = false): Promise<Arrival[]> {
  const key = makeArrivalsKey(dcode, via)
  const now = Date.now()
  pruneArrivalsCache(now)

  const cached = arrivalsCache.get(key)
  if (!forceNetwork && cached && now - cached.timestamp < ARRIVALS_CACHE_TTL) {
    cached.lastAccess = now
    return Promise.resolve(cached.data)
  }

  const inflight = arrivalsInFlight.get(key)
  if (inflight) return inflight

  const request = api.stops.arrivals(dcode, via)
    .then((data) => {
      const ts = Date.now()
      arrivalsCache.set(key, { data, timestamp: ts, lastAccess: ts })
      pruneArrivalsCache(ts)
      return data
    })
    .finally(() => {
      arrivalsInFlight.delete(key)
    })

  arrivalsInFlight.set(key, request)
  return request
}

export function useArrivals(dcode: string, via?: string) {
  const forceNetworkRef = useRef(false)

  const fetcher = useMemo(
    () => () => fetchArrivalsShared(dcode, via, forceNetworkRef.current),
    [dcode, via],
  )

  const polling = usePolling<Arrival[]>(fetcher, ARRIVALS_CACHE_TTL)
  const { refresh: pollingRefresh, ...pollingRest } = polling

  const refresh = useCallback(() => {
    forceNetworkRef.current = true
    pollingRefresh()
    Promise.resolve().then(() => {
      forceNetworkRef.current = false
    })
  }, [pollingRefresh])

  return { ...pollingRest, refresh }
}
