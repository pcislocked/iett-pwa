import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useKioskMode } from '@/hooks/useKioskMode'

export default function OrientationGuard() {
  const { t } = useTranslation()
  const isKiosk = useKioskMode()

  useEffect(() => {
    // Kiosk / display ekranları kendi yönlendirmesine sahip olabilir; kilitlemiyoruz
    if (isKiosk) return

    // Attempt hardware orientation lock to portrait on supported PWA environments
    if (typeof window !== 'undefined' && 'screen' in window && screen.orientation && 'lock' in screen.orientation) {
      (screen.orientation.lock as (orientation: string) => Promise<void>)('portrait-primary').catch(() => {
        // Silently ignored if browser does not permit orientation lock
      })
    }

    return () => {
      try {
        screen.orientation?.unlock?.()
      } catch {
        // ignore
      }
    }
  }, [isKiosk])

  // Kiosk / display ekranları kendi yönlendirmesine sahip olabilir; engellemiyoruz
  if (isKiosk) return null

  return (
    <div
      className="orientation-guard-overlay fixed inset-0 z-[99999] flex-col items-center justify-center p-6 text-center select-none bg-[var(--color-bg)] text-[var(--color-text-1)] backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="orientation-guard-title"
      aria-describedby="orientation-guard-desc"
      tabIndex={-1}
    >
      <div className="relative mb-5 flex items-center justify-center">
        <div className="animate-phone-rotate text-[var(--color-brand)]">
          <svg
            className="w-16 h-16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
      </div>
      <h2 id="orientation-guard-title" className="text-base font-bold tracking-tight mb-2">
        {t('orientation.title', 'Lütfen Cihazınızı Dikey Konuma Getirin')}
      </h2>
      <p id="orientation-guard-desc" className="text-xs text-[var(--color-text-2)] max-w-xs leading-relaxed">
        {t('orientation.desc', 'Bu uygulama yalnızca dikey kullanım için optimize edilmiştir.')}
      </p>
    </div>
  )
}
