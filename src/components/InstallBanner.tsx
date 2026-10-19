import { useTranslation } from 'react-i18next'

interface InstallBannerProps {
  onDismiss: () => void
  onInstall: () => void
}

/** Custom "Add to Home Screen" banner for Android (beforeinstallprompt).  */
export default function InstallBanner({ onDismiss, onInstall }: InstallBannerProps) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed bottom-16 left-3 right-3 z-30 flex items-center gap-3
                    bg-surface-card border border-surface-border rounded-2xl
                    px-4 py-3 shadow-xl"
    >
      <span className="text-2xl shrink-0">🚌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">
          {t('common.addToHome', { defaultValue: 'Ana Ekrana Ekle' })}
        </p>
        <p className="text-xs text-text-secondary leading-tight mt-0.5">
          {t('common.installBannerDesc', { defaultValue: 'çevrimdışı çalışır, pil dostu' })}
        </p>
      </div>
      <button
        onClick={onInstall}
        className="text-brand-400 font-bold text-xs shrink-0 px-2 py-1 rounded-lg hover:bg-brand-900/40 transition-colors"
      >
        {t('common.install', { defaultValue: 'Yükle' })}
      </button>
      <button
        onClick={onDismiss}
        className="text-text-muted hover:text-text-secondary shrink-0 p-1"
        aria-label={t('common.close', { defaultValue: 'Kapat' })}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
