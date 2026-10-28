import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PwaAnnouncementsData } from '@/types/announcements'

export const REMOTE_ANNOUNCEMENTS_URL =
  'https://raw.githubusercontent.com/pcislocked/iett-pwa/master/public/announcements.json'
export const FALLBACK_ANNOUNCEMENTS_URL = '/announcements.json'

export const DISMISSED_STORAGE_KEY = 'iett_dismissed_pwa_announcements'
export const SEEN_SINGLE_STORAGE_KEY = 'iett_seen_single_pwa_announcements'

export function resetDismissedPwaAnnouncements(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY)
    localStorage.removeItem(SEEN_SINGLE_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('iett:announcements-reset'))
  } catch {
    // ignore
  }
}

function readStorageIds(key: string): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'number') : []
  } catch {
    return []
  }
}

function writeStorageIds(key: string, ids: number[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

async function fetchRemoteAnnouncements(signal?: AbortSignal): Promise<PwaAnnouncementsData> {
  try {
    const res = await fetch(REMOTE_ANNOUNCEMENTS_URL, {
      signal,
      cache: 'no-cache',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as PwaAnnouncementsData
  } catch {
    // Fallback to local file bundled with PWA
    const fallbackRes = await fetch(FALLBACK_ANNOUNCEMENTS_URL, {
      signal,
      cache: 'no-cache',
    })
    if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`)
    return (await fallbackRes.json()) as PwaAnnouncementsData
  }
}

export function usePwaAnnouncements() {
  const [dismissedIds, setDismissedIds] = useState<number[]>(() =>
    readStorageIds(DISMISSED_STORAGE_KEY)
  )
  // Track IDs that were already seen before this page session started.
  // Single-show announcements stay visible for the current session,
  // but will be suppressed in subsequent visits once recorded in localStorage.
  const [initialSeenSingleIds, setInitialSeenSingleIds] = useState<number[]>(() =>
    readStorageIds(SEEN_SINGLE_STORAGE_KEY)
  )
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(() => Date.now())

  useEffect(() => {
    const handleReset = () => {
      setDismissedIds([])
      setInitialSeenSingleIds([])
    }
    window.addEventListener('iett:announcements-reset', handleReset)
    return () => window.removeEventListener('iett:announcements-reset', handleReset)
  }, [])

  useEffect(() => {
    // Refresh timestamp every minute or on data fetch
    const interval = window.setInterval(() => {
      setCurrentTimestamp(Date.now())
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const { data, isLoading, isError, refetch } = useQuery<PwaAnnouncementsData>({
    queryKey: ['pwaRemoteAnnouncements'],
    queryFn: ({ signal }) => fetchRemoteAnnouncements(signal),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  })

  // Filter announcements matching date window and exclusion rules
  const activeAnnouncements = useMemo(() => {
    if (!data?.announcements || !Array.isArray(data.announcements)) return []
    const now = currentTimestamp

    return data.announcements.filter((item) => {
      if (!item || typeof item.id !== 'number') return false

      // 1. Check if user dismissed it
      if (item.isIgnorable && dismissedIds.includes(item.id)) {
        return false
      }

      // 2. Check if single-show was already seen in a previous session
      if (item.isSingleShow && initialSeenSingleIds.includes(item.id)) {
        return false
      }

      // 3. Date window check (ISO strings)
      try {
        const start = new Date(item.startDate).getTime()
        const end = new Date(item.endDate).getTime()
        if (Number.isFinite(start) && now < start) return false
        if (Number.isFinite(end) && now > end) return false
      } catch {
        return false
      }

      return true
    })
  }, [data, dismissedIds, initialSeenSingleIds, currentTimestamp])

  // Automatically record single-show announcements into localStorage so next session they won't appear
  useEffect(() => {
    if (activeAnnouncements.length === 0) return

    const singleShowItems = activeAnnouncements.filter((a) => a.isSingleShow)
    if (singleShowItems.length === 0) return

    const existing = readStorageIds(SEEN_SINGLE_STORAGE_KEY)
    const newSeen = Array.from(new Set([...existing, ...singleShowItems.map((a) => a.id)]))
    if (newSeen.length !== existing.length) {
      writeStorageIds(SEEN_SINGLE_STORAGE_KEY, newSeen)
    }
  }, [activeAnnouncements])

  const dismissAnnouncement = useCallback((id: number) => {
    setDismissedIds((prev) => {
      const next = Array.from(new Set([...prev, id]))
      writeStorageIds(DISMISSED_STORAGE_KEY, next)
      return next
    })
  }, [])

  return {
    announcements: activeAnnouncements,
    isLoading,
    isError,
    dismissAnnouncement,
    refetch,
  }
}
