import { useState, useEffect } from 'react'

/**
 * Returns current timestamp (ms) ticking at the specified interval.
 * Automatically pauses when document is hidden and resumes when visible.
 */
export function useNowTicker(intervalMs = 1000, enabled = true): number {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return

    let timerId: ReturnType<typeof setInterval> | null = null

    const startTimer = () => {
      if (!timerId) {
        setNowMs(Date.now())
        timerId = setInterval(() => {
          setNowMs(Date.now())
        }, intervalMs)
      }
    }

    const stopTimer = () => {
      if (timerId) {
        clearInterval(timerId)
        timerId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer()
      } else {
        startTimer()
      }
    }

    if (!document.hidden) {
      startTimer()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs, enabled])

  return nowMs
}
