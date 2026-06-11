import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

export function useArrivals(dcode: string, via?: string) {
  const query = useQuery({
    queryKey: ['arrivals', dcode, via],
    queryFn: ({ signal }) => api.stops.arrivals(dcode, via, { signal }),
    refetchInterval: 20_000,
  })

  return {
    data: query.data ?? null,
    loading: query.isLoading || query.isFetching && !query.data,
    error: query.error ? String(query.error) : null,
    refresh: query.refetch,
    stale: query.isError && !!query.data, // Stale if previous data exists but latest fetch failed
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  }
}
