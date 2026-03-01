import { useEffect, useRef, useState } from 'react'

interface InstallBannerProps {
  onDismiss: () => void
}

/** Custom "Add to Home Screen" banner for Android (beforeinstallprompt).  */
export default function InstallBanner({ onDismiss }: InstallBannerProps) {
  return (
    <div className="fixed bottom-16 left-3 right-3 z-30 flex items-center gap-3
                    bg-surface-card border border-surface-border rounded-2xl
                    px-4 py-3 shadow-xl">
      <span className="text-2xl shrink-0">🚌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">Ana Ekrana Ekle</p>
        <p className="text-xs text-slate-400 leading-tight mt-0.5">çevrimdışı çalışır, pil dostu</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-500 hover:text-slate-300 shrink-0 p-1"
        aria-label="Kapat"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

const DISMISSED_KEY = 'iett-install-dismissed'

/**
 * Hook that returns the install banner element when appropriate.
 * Returns null when: already installed, already dismissed, on iOS (separate flow).
 */
export function useInstallBanner() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      // Show 3s after app loads — give user a moment first
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setShow(false)
    localStorage.setItem(DISMISSED_KEY, '1')
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

// TypeScript doesn't include BeforeInstallPromptEvent — extend it here
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
