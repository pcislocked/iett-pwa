/**
 * Generic polling hook.
 * Fetches immediately, then re-fetches every `intervalMs` milliseconds.
 * Returns { data, loading, error, refresh }.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePollingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
  stale: boolean  // true if we have cached data but last fetch failed
  lastUpdated: Date | null
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 20_000,
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const dataRef = useRef(data)
  dataRef.current = data
  // Tracks whether the component is still mounted; prevents setState after unmount.
  const mountedRef = useRef(false)
  // Incremented on every doFetch call; out-of-order responses from slower earlier
  // requests are dropped so only the most recent fetch wins.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async () => {
    const id = ++fetchIdRef.current
    try {
      const result = await fetcherRef.current()
      if (id !== fetchIdRef.current || !mountedRef.current) return
      setData(result)
      setError(null)
      setStale(false)
      setLastUpdated(new Date())
    } catch (e) {
      if (id !== fetchIdRef.current || !mountedRef.current) return
      setError(e instanceof Error ? e.message : String(e))
      if (dataRef.current !== null) setStale(true)  // keep showing old data
    } finally {
      if (id === fetchIdRef.current && mountedRef.current) setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    void doFetch()
  }, [doFetch])

  useEffect(() => {
    mountedRef.current = true
    void doFetch()
    const id = setInterval(() => { void doFetch() }, intervalMs)
    return () => {
      mountedRef.current = false
      clearInterval(id)
    }
  }, [doFetch, intervalMs])

  return { data, loading, error, refresh, stale, lastUpdated }
}
