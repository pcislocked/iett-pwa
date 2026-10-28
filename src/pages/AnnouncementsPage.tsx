import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type OfficialAnnouncementItem } from '@/api/client'
import { useGlobalNotices } from '@/hooks/useGlobalNotices'
import { usePwaAnnouncements } from '@/hooks/usePwaAnnouncements'
import AnnouncementCard from '@/components/AnnouncementCard'

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'all' | 'official' | 'system' | 'pwa'>('all')

  // Official IETT Announcements (Page 0)
  const {
    data: officialData,
    isLoading: isOfficialLoading,
    isError: isOfficialError,
    refetch: refetchOfficial,
  } = useQuery({
    queryKey: ['announcements', 'official'],
    queryFn: ({ signal }) => api.notices.official(0, { signal }),
    staleTime: 5 * 60 * 1000,
  })

  // System / Global Notices
  const {
    data: globalNotices,
    isLoading: isGlobalLoading,
    isError: isGlobalError,
    refetch: refetchGlobal,
  } = useGlobalNotices()

  // PWA Admin Announcements
  const { announcements: pwaAnnouncements } = usePwaAnnouncements()

  const officialItems = officialData?.items || []
  const globalItems = globalNotices || []
  const officialCount = officialItems.length
  const globalCount = globalItems.length
  const pwaCount = pwaAnnouncements.length
  const totalCount = officialCount + globalCount + pwaCount

  const renderSkeleton = (count: number) => (
    <div className="space-y-3 pt-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-20 bg-surface-card rounded-2xl border border-surface-muted animate-pulse" />
      ))}
    </div>
  )

  const renderPwaList = () =>
    pwaAnnouncements.map((pwa) => (
      <AnnouncementCard
        key={`pwa-${pwa.id}`}
        testId={`pwa-announcement-${pwa.id}`}
        toggleTestId={`pwa-announcement-toggle-${pwa.id}`}
        badge="iett-pwa"
        badgeVariant="pwa"
        date={pwa.date}
        title={pwa.title}
        content={pwa.content}
        isMarkdown={true}
      />
    ))

  const renderGlobalList = () =>
    globalItems.map((notice) => (
      <AnnouncementCard
        key={notice.notice_noticeid}
        testId={`global-notice-${notice.notice_noticeid}`}
        badge={notice.page_name || t('announcements.alert', { defaultValue: 'Sefer Uyarısı' })}
        badgeVariant="alert"
        title={notice.notice_title}
        content={notice.notice_body}
        isMarkdown={false}
      />
    ))

  const renderOfficialList = () =>
    officialItems.map((item: OfficialAnnouncementItem) => {
      const safeHref = /^https?:\/\//i.test(item.url)
        ? item.url
        : 'https://iett.istanbul/announcement/Index'
      return (
        <AnnouncementCard
          key={item.id}
          testId={`official-announcement-${item.id}`}
          badge={t('common.iettBadge', { defaultValue: 'İETT' })}
          badgeVariant="official"
          date={item.date}
          title={item.title}
          href={safeHref}
        />
      )
    })

  const renderOfficialLink = () => (
    <div className="pt-2 pb-1 text-center">
      <a
        href="https://iett.istanbul/announcement/Index"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-card border border-surface-muted text-xs font-semibold text-brand-500 hover:text-brand-400 hover:bg-surface-muted/60 transition-colors shadow-sm"
      >
        <span>{t('announcements.allOfficialLink', { defaultValue: 'Tüm Duyurular (İETT)' })}</span>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )

  const renderFareTariff = () => (
    <div className="mt-4 pt-3 border-t border-surface-muted/60">
      <a
        href="https://iett.istanbul/icerik/IETT-Toplu-Ulasim-ucret-Tarifesi"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-900/40 to-surface-card border border-brand-500/30 hover:border-brand-500/60 rounded-2xl transition-all shadow-sm group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 text-xl">
            💳
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-text-primary group-hover:text-brand-300 transition-colors">
              {t('announcements.fareTariffTitle', { defaultValue: 'Toplu Ulaşım Ücret Tarifesi' })}
            </h4>
            <p className="text-xs text-text-secondary truncate">
              {t('announcements.fareTariffDesc', { defaultValue: 'Güncel bilet, abonman ve aktarma ücretleri' })}
            </p>
          </div>
        </div>
        <svg
          className="w-5 h-5 text-text-muted group-hover:text-brand-400 transition-colors shrink-0 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-base text-text-primary">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-surface-card/90 backdrop-blur border-b border-surface-muted px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-muted/60 transition-colors"
          aria-label={t('common.back', { defaultValue: 'Geri' })}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">
            {t('announcements.title', { defaultValue: 'İETT Duyuruları & Uyarılar' })}
          </h1>
          <p className="text-xs text-text-muted truncate">
            {t('announcements.subtitle', { defaultValue: 'Resmi duyurular, güzergah ve tarife bilgileri' })}
          </p>
        </div>
        <a
          href="https://iett.istanbul/announcement/Index"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl text-brand-400 hover:bg-brand-500/10 transition-colors text-xs font-medium flex items-center gap-1"
          title={t('announcements.openOfficialWeb', { defaultValue: 'Web Sitesinde Aç' })}
        >
          <span>iett.istanbul</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t('announcements.tabsLabel', { defaultValue: 'Duyuru sekmeleri' })}
        className="px-4 pt-3 pb-2 grid grid-cols-4 gap-1.5 border-b border-surface-muted/40"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-xl transition-all text-center truncate ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
          }`}
        >
          {t('announcements.allTab', { defaultValue: 'Tümü' })}
          {totalCount > 0 ? ` (${totalCount})` : ''}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'official'}
          onClick={() => setActiveTab('official')}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-xl transition-all text-center truncate ${
            activeTab === 'official'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
          }`}
        >
          {t('announcements.officialTab', { defaultValue: 'İETT' })}
          {officialCount > 0 ? ` (${officialCount})` : ''}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'system'}
          onClick={() => setActiveTab('system')}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-xl transition-all text-center truncate ${
            activeTab === 'system'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
          }`}
        >
          {t('announcements.systemTab', { defaultValue: 'NTC' })}
          {globalCount > 0 ? ` (${globalCount})` : ''}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'pwa'}
          onClick={() => setActiveTab('pwa')}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-xl transition-all text-center truncate ${
            activeTab === 'pwa'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
          }`}
        >
          {t('announcements.pwaTab', { defaultValue: 'PWA' })}
          {pwaCount > 0 ? ` (${pwaCount})` : ''}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-8">
        {/* All Announcements Tab */}
        {activeTab === 'all' && (
          <>
            {isOfficialLoading && isGlobalLoading && pwaCount === 0 && renderSkeleton(4)}

            {!isOfficialLoading && !isGlobalLoading && totalCount === 0 && (
              <div className="py-12 text-center text-text-muted text-sm">
                {t('announcements.allEmpty', { defaultValue: 'Aktif bir duyuru bulunmuyor.' })}
              </div>
            )}

            {renderPwaList()}
            {isGlobalLoading ? renderSkeleton(2) : renderGlobalList()}
            {isOfficialLoading ? renderSkeleton(3) : renderOfficialList()}
            {renderOfficialLink()}
            {renderFareTariff()}
          </>
        )}

        {/* Official Announcements Tab */}
        {activeTab === 'official' && (
          <>
            {isOfficialLoading && renderSkeleton(4)}

            {isOfficialError && (
              <div className="p-6 text-center bg-surface-card rounded-2xl border border-surface-muted my-4">
                <p className="text-sm text-text-secondary mb-3">
                  {t('announcements.loadError', { defaultValue: 'Resmi duyurular yüklenemedi.' })}
                </p>
                <button
                  onClick={() => refetchOfficial()}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-500 transition-colors"
                >
                  {t('common.retry', { defaultValue: 'Tekrar Dene' })}
                </button>
              </div>
            )}

            {!isOfficialLoading && officialCount === 0 && !isOfficialError && (
              <div className="py-12 text-center text-text-muted text-sm">
                {t('announcements.empty', { defaultValue: 'Duyuru bulunamadı.' })}
              </div>
            )}

            {renderOfficialList()}
            {renderOfficialLink()}
            {renderFareTariff()}
          </>
        )}

        {/* System / NTC Notices Tab */}
        {activeTab === 'system' && (
          <>
            {isGlobalLoading && renderSkeleton(4)}

            {isGlobalError && (
              <div className="p-6 text-center bg-surface-card rounded-2xl border border-surface-muted my-4">
                <p className="text-sm text-text-secondary mb-3">
                  {t('announcements.systemLoadError', { defaultValue: 'Sefer uyarıları yüklenemedi.' })}
                </p>
                <button
                  onClick={() => refetchGlobal()}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-500 transition-colors"
                >
                  {t('common.retry', { defaultValue: 'Tekrar Dene' })}
                </button>
              </div>
            )}

            {!isGlobalLoading && globalCount === 0 && !isGlobalError && (
              <div className="py-12 text-center text-text-muted text-sm">
                {t('announcements.systemEmpty', { defaultValue: 'Aktif bir sefer uyarısı bulunmuyor.' })}
              </div>
            )}

            {renderGlobalList()}
          </>
        )}

        {/* Developer / PWA Announcements Tab */}
        {activeTab === 'pwa' && (
          <>
            {pwaCount === 0 && (
              <div className="py-12 text-center text-text-muted text-sm">
                {t('announcements.pwaEmpty', { defaultValue: 'Aktif bir bildirim bulunmuyor.' })}
              </div>
            )}

            {renderPwaList()}
          </>
        )}
      </div>
    </div>
  )
}
