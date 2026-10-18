import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWakeLockOptions {
  enabled: boolean
  timeoutMs?: number // Default: 30 minutes hard timeout (30 * 60 * 1000 ms)
}

export function useWakeLock({ enabled, timeoutMs = 30 * 60 * 1000 }: UseWakeLockOptions) {
  const [isLocked, setIsLocked] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  const releaseLock = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release()
      } catch {
        // Ignore errors during release
      }
      sentinelRef.current = null
    }
    if (isMountedRef.current) {
      setIsLocked(false)
    }
  }, [])

  const acquireLock = useCallback(async () => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    if (sentinelRef.current && !sentinelRef.current.released) return

    // If hard timeout has already elapsed since session started, do not re-acquire
    if (startTimeRef.current !== null && Date.now() - startTimeRef.current >= timeoutMs) {
      return
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen')
      sentinelRef.current = sentinel
      if (isMountedRef.current) {
        setIsLocked(true)
      }

      sentinel.addEventListener('release', () => {
        if (isMountedRef.current && sentinelRef.current === sentinel) {
          setIsLocked(false)
          sentinelRef.current = null
        }
      })

      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now()
      }

      const remainingTime = Math.max(0, timeoutMs - (Date.now() - startTimeRef.current))
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        releaseLock()
      }, remainingTime)
    } catch {
      // Tolerate NotAllowedError / Low Power Mode / security exceptions silently
      if (isMountedRef.current) {
        setIsLocked(false)
      }
    }
  }, [enabled, timeoutMs, releaseLock])

  useEffect(() => {
    isMountedRef.current = true
    if (enabled) {
      startTimeRef.current = Date.now()
      acquireLock()
    } else {
      startTimeRef.current = null
      releaseLock()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        acquireLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibility)
      releaseLock()
    }
  }, [enabled, acquireLock, releaseLock])

  return {
    isLocked,
    isSupported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
  }
}
