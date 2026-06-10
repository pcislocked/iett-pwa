import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { api, BusPosition } from '@/api/client'

function mapQuery<T>(query: UseQueryResult<T, Error>): { data: T | null; loading: boolean; error: string | null; refresh: () => void; stale: boolean; lastUpdated: Date | null } {
  return {
    data: query.data ?? null,
    loading: query.isLoading || (query.isFetching && !query.data),
    error: query.error ? String(query.error) : null,
    refresh: query.refetch,
    stale: query.isError && !!query.data,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  }
}

export function useFleet() {
  const query = useQuery<BusPosition[]>({
    queryKey: ['fleet'],
    queryFn: () => api.fleet.all(),
    refetchInterval: 30_000,
  })
  return mapQuery(query)
}

export function useRouteBuses(hatKodu: string) {
  const query = useQuery<BusPosition[]>({
    queryKey: ['route_buses', hatKodu],
    queryFn: () => api.routes.buses(hatKodu),
    refetchInterval: 15_000,
    enabled: !!hatKodu,
  })
  return mapQuery(query)
}
