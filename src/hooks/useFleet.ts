import { useMemo } from 'react'
import { usePolling } from './usePolling'
import { api, type BusPosition } from '@/api/client'

export function useFleet() {
  return usePolling<BusPosition[]>(api.fleet.all, 30_000)
}

export function useRouteBuses(hatKodu: string) {
  const fetcher = useMemo(() => () => api.routes.buses(hatKodu), [hatKodu])
  return usePolling<BusPosition[]>(fetcher, 15_000)
}
