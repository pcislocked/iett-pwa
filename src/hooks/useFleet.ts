import { useCallback } from 'react'
import { usePolling } from './usePolling'
import { api, type BusPosition } from '@/api/client'
import { POLLING } from '@/config/polling'

export function useFleet(_routeCode?: string) {
  return usePolling<BusPosition[]>(api.fleet.all, POLLING.FLEET_ALL_MS)
}

export function useRouteBuses(hatKodu: string) {
  const fetcher = useCallback(async () => {
    return api.routes.buses(hatKodu)
  }, [hatKodu])

  return usePolling<BusPosition[]>(fetcher, POLLING.FLEET_SPECIFIC_MS, hatKodu)
}
