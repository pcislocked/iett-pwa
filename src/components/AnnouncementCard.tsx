import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeMarkdown } from '@/components/SafeMarkdown'
import { triggerHaptic } from '@/utils/haptics'

export type AnnouncementBadgeVariant = 'pwa' | 'alert' | 'official'

export interface AnnouncementCardProps {
  badge: string
  badgeVariant?: AnnouncementBadgeVariant
  date?: string
  title: string
  content?: string
  isMarkdown?: boolean
  href?: string
  onDismiss?: () => void
  hapticFeedback?: boolean
  testId?: string
  toggleTestId?: string
  closeTestId?: string
}

const BADGE_STYLES: Record<
  AnnouncementBadgeVariant,
  { badge: string; card: string; close: string; fade: string }
> = {
  pwa: {
    badge: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
    card: 'border-pink-500/30 dark:border-pink-500/20 bg-pink-500/5 dark:bg-pink-950/20',
    close:
      'text-pink-700 dark:text-pink-200 hover:bg-pink-500/20 hover:text-pink-900 dark:hover:text-white',
    fade: 'from-pink-50/95 dark:from-[#1b0812]',
  },
  alert: {
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    card: 'border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20',
    close:
      'text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-950 dark:hover:text-white',
    fade: 'from-amber-50/95 dark:from-[#1b1508]',
  },
  official: {
    badge: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30',
    card: 'border-surface-border hover:border-surface-muted bg-surface-card/70 dark:bg-surface-elevated/40',
    close: 'text-text-muted hover:text-text-primary hover:bg-surface-muted',
    fade: 'from-[var(--color-surface,#fff)] dark:from-[var(--color-surface,#0a0a0a)]',
  },
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  badge,
  badgeVariant = 'official',
  date,
  title,
  content,
  isMarkdown = false,
  href,
  onDismiss,
  hapticFeedback = true,
  testId,
  toggleTestId,
  closeTestId,
}) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const isCollapsible = Boolean(
    content &&
      (content.length > 180 || content.includes('\n\n') || content.split('\n').length > 3)
  )

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerHaptic('selection', hapticFeedback)
    setIsExpanded((prev) => !prev)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerHaptic('light', hapticFeedback)
    onDismiss?.()
  }

  const styleConfig = BADGE_STYLES[badgeVariant] || BADGE_STYLES.official

  const CardWrapper: React.ElementType = href ? 'a' : 'div'
  const wrapperProps = href
    ? {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: `card block group p-3.5 rounded-xl border transition-all shadow-sm ${styleConfig.card}`,
      }
    : {
        className: `card flex flex-col gap-1.5 p-3.5 rounded-xl border shadow-sm ${styleConfig.card}`,
      }

  return (
    <CardWrapper {...wrapperProps} data-testid={testId}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border select-none ${styleConfig.badge}`}
          >
            {badge}
          </span>
          {date && (
            <span className="text-[11px] font-mono text-text-muted select-none">
              {date}
            </span>
          )}
        </div>

        {/* Action Icon on Right */}
        {onDismiss ? (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('common.close', { defaultValue: 'Kapat' })}
            title={t('common.close', { defaultValue: 'Kapat' })}
            data-testid={closeTestId}
            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 active:scale-95 transition cursor-pointer ${
              styleConfig.close || 'text-text-muted hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : href ? (
          <span
            className="shrink-0 text-text-muted group-hover:text-text-primary transition-colors mt-0.5"
            aria-hidden="true"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-bold text-text-primary leading-snug group-hover:text-brand-500 transition-colors">
        {title}
      </h3>

      {/* Body Content */}
      {content && (
        <div className="flex flex-col gap-1 mt-0.5">
          <div
            className={`relative ${
              isCollapsible && !isExpanded ? 'max-h-20 overflow-hidden' : ''
            }`}
          >
            {isMarkdown ? (
              <SafeMarkdown
                content={content}
                className="text-xs text-text-secondary leading-relaxed"
              />
            ) : (
              <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                {content}
              </p>
            )}
            {isCollapsible && !isExpanded && (
              <div
                className={`absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t ${
                  styleConfig.fade
                } to-transparent pointer-events-none opacity-95`}
              />
            )}
          </div>

          {/* Read More / Read Less Toggle */}
          {isCollapsible && (
            <button
              type="button"
              onClick={handleToggleExpand}
              data-testid={toggleTestId || (testId ? `${testId}-toggle` : undefined)}
              className="self-start text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors pt-0.5"
            >
              <span>
                {isExpanded
                  ? t('announcements.pwaReadLess', { defaultValue: 'Daha az göster' })
                  : t('announcements.pwaReadMore', { defaultValue: 'Devamını oku' })}
              </span>
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </CardWrapper>
  )
}

export default AnnouncementCard