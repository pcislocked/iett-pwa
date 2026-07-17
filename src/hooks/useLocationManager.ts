import { useState, useEffect, useRef, useCallback } from 'react'
import { useUserPrefs } from '@/hooks/useUserPrefs'

export const DEFAULT_MOCK_LOCATION: [number, number] = [41.0082, 28.9784] // Sultanahmet

export function useLocationManager() {
  const { prefs, setGpsConsent } = useUserPrefs()
  const [location, setLocation] = useState<[number, number] | null>(null)
  // loading is true while we don't have a location AND we are either pending consent or actively requesting GPS
  const [loading, setLoading] = useState(true)
  const isRequesting = useRef(false)
  const watchdogRef = useRef<number | null>(null)

  const requestLocation = useCallback(() => {
    // If consent is pending, we do not request GPS. We just wait.
    if (prefs.gpsConsent === 'pending') {
      setLoading(true)
      return
    }

    if (isRequesting.current) return
    isRequesting.current = true
    setLoading(true)

    const fallbackToMock = (explicitDenied = false) => {
      setLocation(prefs.mockLocation ?? DEFAULT_MOCK_LOCATION)
      setLoading(false)
      isRequesting.current = false
      if (explicitDenied && prefs.gpsConsent !== 'denied') setGpsConsent('denied')
    }

    // If user explicitly denied in our app, or we saved denied state, just use mock immediately
    if (prefs.gpsConsent === 'denied') {
      fallbackToMock()
      return
    }

    // Otherwise attempt real GPS
    if (!navigator.geolocation) {
      fallbackToMock()
      return
    }

    if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current)
    
    // PWA bug workaround: Native callbacks might never fire on some devices.
    watchdogRef.current = window.setTimeout(() => {
      fallbackToMock()
    }, 12000)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current)
        setLocation([pos.coords.latitude, pos.coords.longitude])
        setLoading(false)
        isRequesting.current = false
        if (prefs.gpsConsent !== 'granted') setGpsConsent('granted')
      },
      (err) => {
        if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current)
        fallbackToMock(err.code === err.PERMISSION_DENIED)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [prefs.gpsConsent, prefs.mockLocation, setGpsConsent])

  useEffect(() => {
    requestLocation()
    return () => {
      if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current)
    }
  }, [requestLocation])

  return { location, loading, requestLocation }
}
