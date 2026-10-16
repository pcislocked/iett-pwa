export type HapticType = 'light' | 'selection' | 'medium' | 'success' | 'warning'

/**
 * Triggers subtle haptic feedback using the Web Vibration API.
 * Designed to provide refined mechanical clicks or light tactile confirmations
 * on mobile devices without excessive vibration or battery drain.
 */
export function triggerHaptic(type: HapticType = 'light', enabled: boolean = true): void {
  if (!enabled) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return

  try {
    switch (type) {
      case 'light':
      case 'selection':
        // Very subtle tactile tap (10ms) - for tab switches, filter toggles
        navigator.vibrate(10)
        break
      case 'medium':
        // Affirmative confirmation (15ms) - for favorites, pins, toggle switches
        navigator.vibrate(15)
        break
      case 'success':
        // Success pulse pattern - for backup export, link copy
        navigator.vibrate([10, 30, 15])
        break
      case 'warning':
        // Gentle caution pattern - for unpin, clear actions
        navigator.vibrate([20, 40, 20])
        break
    }
  } catch {
    // Silently ignore browser permission or security restrictions
  }
}
