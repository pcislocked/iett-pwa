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
      className="h-7 max-h-7 px-4 flex items-center justify-between gap-2 bg-pink-500/15 border-b border-pink-500/30 text-pink-700 dark:text-pink-200 whitespace-nowrap overflow-hidden select-none"
    >
      <Link
        to="/changelog"
        onClick={handleNavigate}
        title={message}
        className="flex-1 min-w-0 truncate text-[11px] font-medium leading-none tracking-tight hover:underline focus:outline-none"
      >
        {message}
      </Link>

      <button
        type="button"
        onClick={handleClose}
        aria-label={t('updateBanner.dismiss', { defaultValue: 'Bildirimi kapat' })}
        data-testid="app-update-banner-close"
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-pink-600 dark:text-pink-300 hover:bg-pink-500/25 active:scale-95 transition"
      >
        <span className="text-xs leading-none font-bold" aria-hidden="true">
          ×
        </span>
      </button>
    </div>
  )
}

export default UpdateBanner
