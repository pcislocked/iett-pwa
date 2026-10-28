import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getCurrentAppVersion } from '@/utils/appUpdate'
import { ensureCurrentVersionStored, normalizeVersion } from '@/hooks/useVersionBanner'

export interface ChangelogItem {
  version: string
  date: string
  title?: {
    tr: string
    en: string
  }
  changes: {
    tr: string[]
    en: string[]
  }
  url?: string
}

export interface ChangelogPayload {
  updatedAt?: string
  releases: ChangelogItem[]
}

const STATIC_FALLBACK_RELEASES: ChangelogItem[] = [
  {
    version: '0.4.11.1',
    date: '2026-10-26',
    title: {
      tr: 'Kiosk Duyuru Kartları, Harita İyileştirmeleri ve Sürüm Geçmişi',
      en: 'Kiosk Announcement Cards, Map Fixes & Changelog',
    },
    changes: {
      tr: [
        'Kiosk modunda duyurular 15 saniyede bir otomatik kayan kartlar haline getirildi.',
        'Haritada durak ikonlarının 404 vermesi ve tıklanabilirlik sorunları düzeltildi.',
        'Dikey ekran kilidi (Portrait Lock) ve mobil yatay mod uyarı katmanı eklendi.',
        'Sürüm geçmişi sayfası ve tek satır pembe güncelleme bildirim çubuğu eklendi.',
      ],
      en: [
        'Kiosk mode announcements now cycle automatically every 15 seconds as sliding cards.',
        'Fixed stop marker icon 404 and unexpected map click interactions.',
        'Added portrait orientation lock and mobile landscape rotation guard overlay.',
        'Added changelog subpage and one-line pink update notification banner.',
      ],
    },
    url: 'https://github.com/pcislocked/iett-pwa/releases/tag/v0.4.11.1',
  },
  {
    version: '0.4.11',
    date: '2026-10-25',
    title: {
      tr: 'Canlı Takip, Rota Önbelleği ve Performans Güncellemesi',
      en: 'Live Tracking, Route Caching & Performance Update',
    },
    changes: {
      tr: [
        'Son 20 dakikada güncellenmeyen bayat araç konumlarının haritada kalması önlendi.',
        'Canlı veri yenileme sıklığı ve harita karo önbelleği optimize edildi.',
        'Ayarlar altına önbellek ve veri sıfırlama araçları eklendi.',
      ],
      en: [
        'Filtered out stale vehicle positions older than 20 minutes from map display.',
        'Optimized live data refresh rates and map tile caching.',
        'Added cache cleaning and factory data reset tools in Settings.',
      ],
    },
    url: 'https://github.com/pcislocked/iett-pwa/releases/tag/v0.4.11',
  },
]

function formatReleaseDate(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`
  }
  return trimmed
}

export function ChangelogPage() {
  const { t, i18n } = useTranslation()
  const [releases, setReleases] = useState<ChangelogItem[]>(STATIC_FALLBACK_RELEASES)
  const [loading, setLoading] = useState(true)

  const currentVersion = useMemo(() => normalizeVersion(getCurrentAppVersion()), [])
  const lang = (i18n.language?.startsWith('en') ? 'en' : 'tr') as 'tr' | 'en'

  useEffect(() => {
    // When user visits changelog, mark current version as seen so the update banner doesn't persist
    ensureCurrentVersionStored()
  }, [])

  useEffect(() => {
    let active = true

    async function loadChangelog() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}changelog.json?t=${Date.now()}`)
        if (res.ok) {
          const data = (await res.json()) as ChangelogPayload
          if (active && Array.isArray(data.releases) && data.releases.length > 0) {
            setReleases(data.releases)
          }
        }
      } catch {
        // Silently use static fallback releases on fetch failure or offline mode
      } finally {
        if (active) setLoading(false)
      }

      // Optional: Enrich with GitHub releases in the background (cached in sessionStorage)
      try {
        const cacheKey = 'iett:github-releases-cache'
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached) as ChangelogItem[]
          if (active && Array.isArray(parsed) && parsed.length > 0) {
            mergeGitHubReleases(parsed)
          }
          return
        }

        const ghRes = await fetch(
          'https://api.github.com/repos/pcislocked/iett-pwa/releases?per_page=10',
          { headers: { Accept: 'application/vnd.github+json' } },
        )
        if (ghRes.ok) {
          const items = (await ghRes.json()) as Array<{
            tag_name: string
            name?: string
            body?: string
            published_at?: string
            html_url?: string
          }>

          const parsedList: ChangelogItem[] = items.map((it) => {
            const ver = normalizeVersion(it.tag_name)
            const dateStr = it.published_at ? it.published_at.slice(0, 10) : ''
            const rawBody = it.body || ''
            const lines = rawBody
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.startsWith('- ') || l.startsWith('* '))
              .map((l) => l.replace(/^[-*]\s+/, ''))

            return {
              version: ver,
              date: dateStr,
              title: {
                tr: it.name || `Sürüm v${ver}`,
                en: it.name || `Release v${ver}`,
              },
              changes: {
                tr: lines.length > 0 ? lines : [it.name || `v${ver}`],
                en: lines.length > 0 ? lines : [it.name || `v${ver}`],
              },
              url: it.html_url || `https://github.com/pcislocked/iett-pwa/releases/tag/${it.tag_name}`,
            }
          })

          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(parsedList))
          } catch {
            // Ignore quota errors
          }

          if (active && parsedList.length > 0) {
            mergeGitHubReleases(parsedList)
          }
        }
      } catch {
        // Silently ignore GitHub API failures (offline, rate limit, CORS)
      }
    }

    function mergeGitHubReleases(incoming: ChangelogItem[]) {
      setReleases((prev) => {
        const existingVersions = new Set(prev.map((r) => normalizeVersion(r.version)))
        const newOnes = incoming.filter((r) => !existingVersions.has(normalizeVersion(r.version)))
        if (newOnes.length === 0) return prev
        return [...prev, ...newOnes]
      })
    }

    void loadChangelog()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full pb-20">
      <header className="mb-6 pt-2 border-b border-surface-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          {t('changelog.title', { defaultValue: 'Sürüm Geçmişi' })}
        </h1>
        <p className="text-xs text-text-muted mt-1">
          {t('changelog.subtitle', { defaultValue: 'Uygulama güncellemeleri ve yenilikler' })}
        </p>
      </header>

      {loading && releases.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-muted">
          ⌛ {t('common.loading', { defaultValue: 'Yükleniyor...' })}
        </div>
      ) : releases.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-muted">
          {t('changelog.empty', { defaultValue: 'Henüz sürüm kaydı bulunamadı.' })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {releases.map((rel) => {
            const relVersion = normalizeVersion(rel.version)
            const isCurrent = relVersion === currentVersion
            const title = rel.title?.[lang] || rel.title?.tr || `v${relVersion}`
            const changes = rel.changes?.[lang] || rel.changes?.tr || []

            return (
              <article
                key={relVersion}
                data-testid={`changelog-item-${relVersion}`}
                className={`p-4 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'border-pink-500/40 bg-pink-500/5 dark:bg-pink-500/10'
                    : 'border-surface-border bg-surface-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-text-primary">
                      v{relVersion}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/30">
                        {t('changelog.currentBadge', { defaultValue: 'Aktif Sürüm' })}
                      </span>
                    )}
                  </div>
                  {rel.date && (
                    <time className="text-xs text-text-muted font-mono">
                      {formatReleaseDate(rel.date)}
                    </time>
                  )}
                </div>

                {title && (
                  <h2 className="text-sm font-semibold text-text-primary mb-2.5">
                    {title}
                  </h2>
                )}

                {changes.length > 0 && (
                  <ul className="space-y-1.5 list-disc list-inside text-xs text-text-secondary leading-relaxed">
                    {changes.map((item, idx) => (
                      <li key={idx} className="pl-1">
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {rel.url && (
                  <div className="mt-3 pt-2.5 border-t border-surface-border/50 text-right">
                    <a
                      href={rel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline font-medium inline-flex items-center gap-1"
                    >
                      {t('changelog.viewOnGithub', { defaultValue: 'GitHub üzerinde incele' })} →
                    </a>
                  </div>
                )}
              </article>
            )
          })}

          <div className="mt-4 pt-4 border-t border-surface-border/60 text-center">
            <a
              href="https://github.com/pcislocked/iett-pwa/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1.5"
            >
              <span>{t('changelog.allReleasesOnGithub', { defaultValue: 'Tüm sürümleri GitHub Releases sayfasında incele' })}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChangelogPage
