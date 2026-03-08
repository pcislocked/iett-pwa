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

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setData(result)
      setError(null)
      setStale(false)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      if (dataRef.current !== null) setStale(true)  // keep showing old data
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    void doFetch()
  }, [doFetch])

  useEffect(() => {
    void doFetch()
    const id = setInterval(() => { void doFetch() }, intervalMs)
    return () => clearInterval(id)
  }, [doFetch, intervalMs])

  return { data, loading, error, refresh, stale, lastUpdated }
}
