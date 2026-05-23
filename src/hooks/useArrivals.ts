import { useCallback } from 'react'
import { usePolling } from './usePolling'
import { api, type Arrival } from '@/api/client'
import { POLLING } from '@/config/polling'

export function useArrivals(dcode: string, via?: string) {
  const fetcher = useCallback(async () => {
    return api.stops.arrivals(dcode, via)
  }, [dcode, via])

  return usePolling<Arrival[]>(fetcher, POLLING.ARRIVALS_MS)
}
