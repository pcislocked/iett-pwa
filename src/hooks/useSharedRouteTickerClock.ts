import { useEffect, useState } from 'react'

/**
 * Singleton manager for shared route-ticker clock.
 * Uses a single setInterval across all RouteTickerRows to reduce CPU/battery usage.
 */
let sharedRouteTickerNowMs = Date.now()
let sharedRouteTickerInterval: ReturnType<typeof setInterval> | null = null
let sharedRouteTickerAlignTimeout: ReturnType<typeof setTimeout> | null = null
const sharedRouteTickerSubscribers = new Set<() => void>()

function notifySharedRouteTickerNow() {
  sharedRouteTickerNowMs = Date.now()
  sharedRouteTickerSubscribers.forEach((notify) => notify())
}

function startSharedRouteTickerClock() {
  if (sharedRouteTickerInterval !== null || sharedRouteTickerAlignTimeout !== null) return
  notifySharedRouteTickerNow()

  const msUntilNextMinute = 60_000 - (sharedRouteTickerNowMs % 60_000)
  sharedRouteTickerAlignTimeout = setTimeout(() => {
    sharedRouteTickerAlignTimeout = null
    notifySharedRouteTickerNow()
    sharedRouteTickerInterval = setInterval(() => {
      notifySharedRouteTickerNow()
    }, 60_000)
  }, msUntilNextMinute)
}

function stopSharedRouteTickerClock() {
  if (sharedRouteTickerSubscribers.size > 0) return
  if (sharedRouteTickerAlignTimeout !== null) {
    clearTimeout(sharedRouteTickerAlignTimeout)
    sharedRouteTickerAlignTimeout = null
  }
  if (sharedRouteTickerInterval !== null) {
    clearInterval(sharedRouteTickerInterval)
    sharedRouteTickerInterval = null
  }
}

function subscribeToSharedRouteTickerClock(notify: () => void) {
  sharedRouteTickerSubscribers.add(notify)
  startSharedRouteTickerClock()
  return () => {
    sharedRouteTickerSubscribers.delete(notify)
    stopSharedRouteTickerClock()
  }
}

/**
 * Hook to subscribe to the shared route-ticker clock.
 * Returns the current nowMs, updates once per minute.
 */
export function useSharedRouteTickerNowMs(): number {
  const [nowMs, setNowMs] = useState(() => sharedRouteTickerNowMs)

  useEffect(() => {
    setNowMs(sharedRouteTickerNowMs)
    return subscribeToSharedRouteTickerClock(() => {
      setNowMs(sharedRouteTickerNowMs)
    })
  }, [])

  return nowMs
}
