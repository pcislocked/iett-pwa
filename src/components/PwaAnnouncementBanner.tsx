import React, { useState } from 'react'
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
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({})

  if (!announcements || announcements.length === 0) {
    return null
  }

  const handleToggleExpand = (id: number) => {
    triggerHaptic('selection', hapticFeedback)
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div
      role="region"
      aria-label={t('announcements.pwaSectionTitle', { defaultValue: 'İETT PWA Duyuruları' })}
      className="flex flex-col border-b border-pink-500/30 bg-pink-500/10 dark:bg-pink-950/40 divide-y divide-pink-500/20"
    >
      {announcements.map((ann) => {
        const handleDismiss = (e: React.MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          triggerHaptic('light', hapticFeedback)
          onDismiss(ann.id)
        }

        const isCollapsible =
          ann.content.length > 200 ||
          ann.content.includes('\n\n') ||
          ann.content.split('\n').length > 3
        const isExpanded = Boolean(expandedIds[ann.id])

        return (
          <div
            key={ann.id}
            data-testid={`pwa-announcement-${ann.id}`}
            className="px-4 py-3 flex flex-col gap-1.5"
          >
            {/* Top Row: [iett-pwa] [date] [✕ if isIgnorable] */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-pink-500/20 text-pink-800 dark:text-pink-200 border border-pink-500/40 px-1.5 py-0.5 rounded select-none">
                  iett-pwa
                </span>
                <span className="text-[11px] font-mono text-pink-700/80 dark:text-pink-200/80">
                  {ann.date}
                </span>
              </div>

              {ann.isIgnorable && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-pink-700 dark:text-pink-200 hover:bg-pink-500/20 hover:text-pink-900 dark:hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 active:scale-95 transition cursor-pointer"
                  aria-label={t('common.close', { defaultValue: 'Kapat' })}
                  title={t('common.close', { defaultValue: 'Kapat' })}
                  data-testid={`pwa-announcement-close-${ann.id}`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Title */}
            <h3 className="text-[13px] font-bold text-pink-950 dark:text-pink-50 leading-snug">
              {ann.title}
            </h3>

            {/* Content (Markdown) with Collapsible Truncation */}
            <div
              className={`relative ${
                isCollapsible && !isExpanded ? 'max-h-24 overflow-hidden' : ''
              }`}
            >
              <SafeMarkdown
                content={ann.content}
                className="text-xs text-pink-900 dark:text-pink-100 leading-relaxed"
              />
              {isCollapsible && !isExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-pink-50 dark:from-[#1b0812] to-transparent pointer-events-none" />
              )}
            </div>

            {/* Read More / Read Less Toggle */}
            {isCollapsible && (
              <button
                type="button"
                onClick={() => handleToggleExpand(ann.id)}
                data-testid={`pwa-announcement-toggle-${ann.id}`}
                className="self-start mt-1 text-[11px] font-semibold text-pink-800 dark:text-pink-200 hover:text-pink-950 dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>
                  {isExpanded
                    ? t('announcements.pwaReadLess', { defaultValue: 'Daha az göster' })
                    : t('announcements.pwaReadMore', { defaultValue: 'Devamını oku' })}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PwaAnnouncementBanner
