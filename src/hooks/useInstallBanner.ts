import { useEffect, useRef, useState } from 'react'

const DISMISSED_KEY = 'iett-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Hook that manages showing the custom install banner when appropriate.
 *
 * Returns: { show, dismiss, install }
 *   - show: whether the banner should be visible
 *   - dismiss: hide the banner and remember dismissal
 *   - install: trigger the PWA installation prompt
 *
 * The banner is never shown when:
 *   - the app is already installed (standalone display mode)
 *   - the user has already dismissed it
 *   - on iOS (different install flow)
 */
export function useInstallBanner() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
    } catch {
      return
    }

    // Don't show on iOS (Safari has its own share-sheet install flow)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    // Don't show if already installed as a PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone
    if (isIos || isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      // Show 3s after app loads — give user a moment first
      timeoutId.current = setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (timeoutId.current !== null) {
        clearTimeout(timeoutId.current)
        timeoutId.current = null
      }
    }
  }, [])

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* storage disabled */
    }
  }

  async function install() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') setShow(false)
    deferredPrompt.current = null
  }

  return { show, dismiss, install }
}
