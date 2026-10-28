import { useTranslation } from 'react-i18next'
import { useKioskMode } from '@/hooks/useKioskMode'

export default function OrientationGuard() {
  const { t } = useTranslation()
  const isKiosk = useKioskMode()

  // Kiosk / display ekranları kendi yönlendirmesine sahip olabilir; engellemiyoruz
  if (isKiosk) return null

  return (
    <div
      className="orientation-guard-overlay fixed inset-0 z-[99999] hidden flex-col items-center justify-center p-6 text-center select-none bg-[var(--color-bg)] text-[var(--color-text-1)] backdrop-blur-md"
      role="alert"
      aria-live="assertive"
      aria-modal="true"
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
      <h2 className="text-base font-bold tracking-tight mb-2">
        {t('orientation.title', 'Lütfen Cihazınızı Dikey Konuma Getirin')}
      </h2>
      <p className="text-xs text-[var(--color-text-2)] max-w-xs leading-relaxed">
        {t('orientation.desc', 'Bu uygulama yalnızca dikey kullanım için optimize edilmiştir.')}
      </p>
    </div>
  )
}
