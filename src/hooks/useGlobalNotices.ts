import { useQuery } from '@tanstack/react-query'
import { api, type GlobalNotice } from '@/api/client'

export function useGlobalNotices() {
  return useQuery<GlobalNotice[]>({
    queryKey: ['globalNotices'],
    queryFn: async ({ signal }) => {
      try {
        return await api.notices.global({ signal })
      } catch (err) {
        console.warn('Failed to fetch global notices', err)
        return []
      }
    },
    // Check every 10 minutes in the frontend (backend caches it for 1 hour anyway)
    refetchInterval: 600_000,
    staleTime: 300_000,
    retry: 2,
  })
}
