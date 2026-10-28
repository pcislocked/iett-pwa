import React from 'react'
import { useTranslation } from 'react-i18next'
import type { PwaAnnouncement } from '@/types/announcements'
import { SafeMarkdown } from '@/components/SafeMarkdown'
import { triggerHaptic } from '@/utils/haptics'

export interface PwaAnnouncementBannerProps {
  announcements: PwaAnnouncement[]
  onDismiss: (id: number) => void
  hapticFeedback?: boolean
}

export const PwaAnnouncementBanner: React.FC<PwaAnnouncementBannerProps> = ({
  announcements,
  onDismiss,
  hapticFeedback = true,
}) => {
  const { t } = useTranslation()

  if (!announcements || announcements.length === 0) {
    return null
  }

  return (
    <div
      role="region"
      aria-label={t('announcements.pwaSectionTitle', { defaultValue: 'İETT PWA Duyuruları' })}
      className="flex flex-col border-b border-pink-500/30 bg-pink-500/10 dark:bg-pink-950/20 divide-y divide-pink-500/20"
    >
      {announcements.map((ann) => {
        const handleDismiss = (e: React.MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          triggerHaptic('light', hapticFeedback)
          onDismiss(ann.id)
        }

        return (
          <div
            key={ann.id}
            data-testid={`pwa-announcement-${ann.id}`}
            className="px-4 py-3 flex flex-col gap-1.5"
          >
            {/* Top Row: [iett-pwa] [date] [✕ if isIgnorable] */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-pink-500/25 text-pink-700 dark:text-pink-300 border border-pink-500/40 px-1.5 py-0.5 rounded select-none">
                  iett-pwa
                </span>
                <span className="text-[11px] font-mono text-pink-700/80 dark:text-pink-300/80">
                  {ann.date}
                </span>
              </div>

              {ann.isIgnorable && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -my-2 text-pink-600 dark:text-pink-300 hover:text-pink-800 dark:hover:text-pink-100 transition-colors cursor-pointer select-none"
                  aria-label={t('common.close', { defaultValue: 'Kapat' })}
                  title={t('common.close', { defaultValue: 'Kapat' })}
                >
                  <span className="text-sm font-bold leading-none" aria-hidden="true">
                    ✕
                  </span>
                </button>
              )}
            </div>

            {/* Title */}
            <h3 className="text-[13px] font-bold text-pink-900 dark:text-pink-100 leading-snug">
              {ann.title}
            </h3>

            {/* Content (Markdown) */}
            <SafeMarkdown
              content={ann.content}
              className="text-xs text-pink-800/90 dark:text-pink-200/90"
            />
          </div>
        )
      })}
    </div>
  )
}

export default PwaAnnouncementBanner
