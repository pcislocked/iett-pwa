import { useMemo } from 'react'
import { usePolling } from './usePolling'
import { api, type Arrival } from '@/api/client'

export function useArrivals(dcode: string, via?: string) {
  const fetcher = useMemo(
    () => () => api.stops.arrivals(dcode, via),
    [dcode, via],
  )
  return usePolling<Arrival[]>(fetcher, 20_000)
}
