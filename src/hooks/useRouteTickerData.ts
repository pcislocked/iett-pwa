import { useQuery } from '@tanstack/react-query'
import { api, type ScheduledDeparture, type RouteMetadata } from '@/api/client'

type CacheEntry = { schedule: ScheduledDeparture[]; metadata: RouteMetadata[] | null }

/**
 * Hook to fetch route schedule + metadata with in-flight deduplication.
 * Multiple components requesting the same route code share active requests and
 * recently fetched responses automatically via React Query.
 */
export function useRouteTickerData(code: string) {
  const query = useQuery({
    queryKey: ['route_ticker', code],
    queryFn: ({ signal }) => Promise.all([api.routes.schedule(code, { signal }), api.routes.metadata(code, { signal })]).then(
      ([schedule, metadata]): CacheEntry => ({ schedule, metadata })
    ),
    refetchInterval: 300_000,
    staleTime: 300_000,
    enabled: !!code,
  })

  return {
    data: query.data ?? null,
    loading: query.isLoading || (query.isFetching && !query.data),
    error: query.error ? String(query.error) : null,
    refresh: query.refetch,
    stale: query.isError && !!query.data,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  }
}
