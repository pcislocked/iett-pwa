/**
 * Platform detection utilities for progressive enhancements and device-specific quirks.
 */

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIPhoneIPodIPad = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports 'MacIntel' with maxTouchPoints > 1
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isIPhoneIPodIPad || isIPadOS
}
