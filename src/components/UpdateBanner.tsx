import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { triggerHaptic } from '@/utils/haptics'

export interface UpdateBannerProps {
  oldVersion: string
  newVersion: string
  onDismiss: () => void
  hapticFeedback?: boolean
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  oldVersion,
  newVersion,
  onDismiss,
  hapticFeedback = true,
}) => {
  const { t } = useTranslation()

  const handleNavigate = () => {
    triggerHaptic('light', hapticFeedback)
    onDismiss()
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerHaptic('light', hapticFeedback)
    onDismiss()
  }

  const message = t('updateBanner.message', {
    old: oldVersion,
    new: newVersion,
    defaultValue: `✨ Uygulama güncellendi (v${oldVersion} > v${newVersion})`,
  })

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="app-update-banner"
      className="h-7 max-h-7 px-4 flex items-center justify-between gap-2 bg-pink-500/10 dark:bg-pink-950/40 border-b border-pink-500/30 text-pink-900 dark:text-pink-100 whitespace-nowrap overflow-hidden select-none"
    >
      <Link
        to="/changelog"
        onClick={handleNavigate}
        title={message}
        className="flex-1 min-w-0 truncate text-[11px] font-medium leading-none tracking-tight hover:underline text-pink-900 dark:text-pink-100 hover:text-pink-950 dark:hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 rounded"
      >
        {message}
      </Link>

      <button
        type="button"
        onClick={handleClose}
        aria-label={t('updateBanner.dismiss', { defaultValue: 'Bildirimi kapat' })}
        data-testid="app-update-banner-close"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-pink-700 dark:text-pink-200 hover:bg-pink-500/20 hover:text-pink-900 dark:hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 active:scale-95 transition cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default UpdateBanner
