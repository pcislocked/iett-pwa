import { useCallback } from 'react'
import { usePolling } from './usePolling'
import { api, type BusPosition } from '@/api/client'
import { POLLING } from '@/config/polling'

export function useFleet(_routeCode?: string) {
  const fetcher = useCallback(async (opts?: { signal?: AbortSignal }) => {
    return api.fleet.all(opts)
  }, [])
  return usePolling<BusPosition[]>(fetcher, POLLING.FLEET_ALL_MS)
}

export function useRouteBuses(hatKodu: string) {
  const fetcher = useCallback(async (opts?: { signal?: AbortSignal }) => {
    return api.routes.buses(hatKodu, opts)
  }, [hatKodu])

  return usePolling<BusPosition[]>(fetcher, POLLING.FLEET_SPECIFIC_MS, hatKodu)
}
