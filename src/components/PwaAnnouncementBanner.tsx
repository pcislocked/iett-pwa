import React from 'react'
import { useTranslation } from 'react-i18next'
import type { PwaAnnouncement } from '@/types/announcements'
import { AnnouncementCard } from '@/components/AnnouncementCard'

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
      className="flex flex-col gap-2"
    >
      {announcements.map((ann) => (
        <AnnouncementCard
          key={ann.id}
          testId={`pwa-announcement-${ann.id}`}
          toggleTestId={`pwa-announcement-toggle-${ann.id}`}
          closeTestId={ann.isIgnorable ? `pwa-announcement-close-${ann.id}` : undefined}
          badge="iett-pwa"
          badgeVariant="pwa"
          date={ann.date}
          title={ann.title}
          content={ann.content}
          isMarkdown={true}
          onDismiss={ann.isIgnorable ? () => onDismiss(ann.id) : undefined}
          hapticFeedback={hapticFeedback}
        />
      ))}
    </div>
  )
}

export default PwaAnnouncementBanner