/**
 * Generic polling hook.
 * Fetches immediately, then re-fetches every `intervalMs` milliseconds.
 * Returns { data, loading, error, refresh }.
 */
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'

interface UsePollingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
  stale: boolean  // true if we have cached data but last fetch failed
  lastUpdated: Date | null
  iettUpdated: Date | null
}

export function usePolling<T>(
  fetcher: (opts?: { signal?: AbortSignal }) => Promise<T>,
  intervalMs = 20_000,
  key?: string | number | boolean | null,
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [iettUpdated, setIettUpdated] = useState<Date | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const dataRef = useRef(data)
  useLayoutEffect(() => {
    dataRef.current = data
  }, [data])
  // Tracks whether the component is still mounted; prevents setState after unmount.
  const mountedRef = useRef(false)
  // Incremented on every doFetch call; out-of-order responses from slower earlier
  // requests are dropped so only the most recent fetch wins.
  const fetchIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const doFetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const ac = new AbortController()
    abortControllerRef.current = ac

    const id = ++fetchIdRef.current
    try {
      const result = await fetcherRef.current({ signal: ac.signal })
      if (id !== fetchIdRef.current || !mountedRef.current) return
      setData(result)
      setError(null)
      setStale(false)
      setLastUpdated(new Date())
      const resObj = result as Record<string, unknown> | null
      const iettDate = resObj && typeof resObj === 'object' && '__iettUpdated' in resObj ? (resObj.__iettUpdated as Date) : null
      setIettUpdated(iettDate)
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
    return () => {
      mountedRef.current = false
      // Invalidate any in-flight request on unmount.
      fetchIdRef.current += 1
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void doFetch()
    const id = setInterval(() => { void doFetch() }, intervalMs)
    return () => {
      // Invalidate in-flight requests from the previous polling cycle.
      fetchIdRef.current += 1
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      clearInterval(id)
    }
  }, [doFetch, intervalMs, key])

  return { data, loading, error, refresh, stale, lastUpdated, iettUpdated }
}
