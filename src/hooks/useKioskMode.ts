import { useLocation } from 'react-router-dom'

/**
 * useKioskMode
 *
 * Checks if the current page URL has kiosk/embed query parameters:
 * ?kiosk=1, ?kiosk=true, ?embed=1, ?embed=true
 */
export function useKioskMode(): boolean {
  try {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    return (
      params.get('kiosk') === '1' ||
      params.get('kiosk') === 'true' ||
      params.get('embed') === '1' ||
      params.get('embed') === 'true'
    )
  } catch {
    // Fallback if rendered outside of a Router context
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return (
        params.get('kiosk') === '1' ||
        params.get('kiosk') === 'true' ||
        params.get('embed') === '1' ||
        params.get('embed') === 'true'
      )
    }
    return false
  }
}
