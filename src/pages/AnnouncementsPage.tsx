import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type OfficialAnnouncementItem } from '@/api/client'
import { useGlobalNotices } from '@/hooks/useGlobalNotices'

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'official' | 'system'>('official')
  const [page, setPage] = useState(0)
  const [filterText, setFilterText] = useState('')

  // Official IETT Announcements
  const {
    data: officialData,
    isLoading: isOfficialLoading,
    isError: isOfficialError,
    refetch: refetchOfficial,
  } = useQuery({
    queryKey: ['announcements', 'official', page],
    queryFn: ({ signal }) => api.notices.official(page, { signal }),
    staleTime: 5 * 60 * 1000,
  })

  // System / Global Notices
  const {
    data: globalNotices,
    isLoading: isGlobalLoading,
    isError: isGlobalError,
    refetch: refetchGlobal,
  } = useGlobalNotices()

  const filteredOfficial = useMemo(() => {
    if (!officialData?.items) return []
    const q = filterText.trim().toLowerCase()
    if (!q) return officialData.items
    return officialData.items.filter((item: OfficialAnnouncementItem) =>
      item.title.toLowerCase().includes(q) || item.date.toLowerCase().includes(q)
    )
  }, [officialData, filterText])

  const filteredGlobal = useMemo(() => {
    if (!globalNotices) return []
    const q = filterText.trim().toLowerCase()
    if (!q) return globalNotices
    return globalNotices.filter((n) =>
      n.notice_title.toLowerCase().includes(q) || n.notice_body.toLowerCase().includes(q)
    )
  }, [globalNotices, filterText])

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
      <div role="tablist" aria-label={t('announcements.tabsLabel', { defaultValue: 'Duyuru sekmeleri' })} className="px-4 pt-3 pb-2 flex gap-2 border-b border-surface-muted/40">
        <button
          role="tab"
          aria-selected={activeTab === 'official'}
          onClick={() => setActiveTab('official')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'official'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
          }`}
        >
          📢 {t('announcements.officialTab', { defaultValue: 'Resmi Duyurular' })}
          {officialData?.total_items ? ` (${officialData.total_items})` : ''}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'system'}
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'system'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface-card text-text-secondary hover:bg-surface-muted'
          }`}
        >
          ⚠️ {t('announcements.systemTab', { defaultValue: 'Sefer Uyarıları' })}
          {globalNotices?.length ? ` (${globalNotices.length})` : ''}
        </button>
      </div>

      {/* Search Filter */}
      <div className="px-4 py-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t('announcements.filterPlaceholder', { defaultValue: 'Duyurularda ara...' })}
            aria-label={t('announcements.filterPlaceholder', { defaultValue: 'Duyurularda ara...' })}
            className="w-full bg-surface-card border border-surface-muted rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-8">
        {/* Official Announcements Tab */}
        {activeTab === 'official' && (
          <>
            {isOfficialLoading && (
              <div className="space-y-3 pt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface-card rounded-2xl border border-surface-muted animate-pulse" />
                ))}
              </div>
            )}

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

            {!isOfficialLoading && filteredOfficial.length === 0 && !isOfficialError && (
              <div className="py-12 text-center text-text-muted text-sm">
                {t('announcements.empty', { defaultValue: 'Duyuru bulunamadı.' })}
              </div>
            )}

            {filteredOfficial.map((item: OfficialAnnouncementItem) => {
              const safeHref = /^https?:\/\//i.test(item.url)
                ? item.url
                : 'https://iett.istanbul/announcement/Index'
              return (
              <a
                key={item.id}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-surface-card border border-surface-muted hover:border-brand-500/40 rounded-2xl transition-all shadow-sm group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-medium text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">
                    📅 {item.date}
                  </span>
                  <span className="text-xs text-text-muted group-hover:text-brand-400 transition-colors flex items-center gap-0.5">
                    {t('announcements.readMore', { defaultValue: 'Detay' })} ↗
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-brand-300 transition-colors leading-snug">
                  {item.title}
                </h3>
              </a>
              )
            })}

            {/* Pagination Controls */}
            {officialData && officialData.total_items > 0 && (
              <div className="pt-3 pb-2 flex items-center justify-between gap-3 text-xs">
                <button
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-2 bg-surface-card border border-surface-muted rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-muted transition-colors"
                >
                  ← {t('common.prev', { defaultValue: 'Önceki' })}
                </button>
                <span className="text-text-muted">
                  {t('common.page', { defaultValue: 'Sayfa' })} {page + 1}
                </span>
                <button
                  disabled={filteredOfficial.length < 10}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-2 bg-surface-card border border-surface-muted rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-muted transition-colors"
                >
                  {t('common.next', { defaultValue: 'Sonraki' })} →
                </button>
              </div>
            )}
          </>
        )}

        {/* System Notices Tab */}
        {activeTab === 'system' && (
          <>
            {isGlobalLoading && (
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface-card rounded-2xl border border-surface-muted animate-pulse" />
                ))}
              </div>
            )}

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

            {!isGlobalLoading && filteredGlobal.length === 0 && !isGlobalError && (
              <div className="py-12 text-center text-text-muted text-sm">
                {t('announcements.systemEmpty', { defaultValue: 'Aktif bir sefer uyarısı bulunmuyor.' })}
              </div>
            )}

            {filteredGlobal.map((notice) => (
              <div
                key={notice.notice_noticeid}
                className="p-4 bg-surface-card border border-surface-muted rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    ⚠️ {notice.page_name || t('announcements.alert', { defaultValue: 'Uyarı' })}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">
                  {notice.notice_title}
                </h3>
                <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                  {notice.notice_body}
                </p>
              </div>
            ))}
          </>
        )}

        {/* Fare Tariff External Banner Card */}
        <div className="mt-6 pt-4 border-t border-surface-muted/60">
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
      </div>
    </div>
  )
}
