import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PinnedStopRow from '@/components/PinnedStopRow'
import { PINNED_STOPS_MAX, useUserPrefs, type PinnedStop } from '@/hooks/useUserPrefs'
import { getRecent, type RecentSearch } from '@/hooks/useRecentSearches'
import { api, type NearbyStop, type ScheduledDeparture } from '@/api/client'
import { distanceLabel } from '@/utils/distance'
import LocationConsentModal from '@/components/LocationConsentModal'
import { useLocationManager } from '@/hooks/useLocationManager'
import { etaTextClass } from '@/utils/etaColor'
import { useFavorites } from '@/hooks/useFavorites'
import { useGlobalNotices } from '@/hooks/useGlobalNotices'
import { getDirectionLabel } from '@/utils/routeDirectionLabels'
import { useSharedRouteTickerNowMs } from '@/hooks/useSharedRouteTickerClock'
import { useRouteTickerData } from '@/hooks/useRouteTickerData'
import PullToRefresh from '@/components/PullToRefresh'
import { useTranslation } from 'react-i18next'
import pkg from '../../package.json'



// ── Quick-access item ──────────────────────────────────────────────────────────
function QuickRow({
  to,
  onPress,
  icon,
  label,
  sub,
}: {
  to?: string
  onPress?: () => void
  icon: React.ReactNode
  label: string
  sub: string
}) {
  const inner = (
    <>
      <span style={{ color: 'var(--wp-accent)' }} className="shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {sub && <div className="text-xs text-text-secondary">{sub}</div>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
           className="w-4 h-4 shrink-0 text-text-muted">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </>
  )
  if (to) return <Link to={to} className="metro-row">{inner}</Link>
  return <button onClick={onPress} className="metro-row w-full text-left">{inner}</button>
}

function LoadingDots({ text }: { text: string }) {
  const [frame, setFrame] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    timerRef.current = setInterval(() => setFrame(f => (f + 1) % 4), 400)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])
  const dots = ['·', '··', '···', '····'][frame]
  return (
    <div aria-live="polite" className="flex items-center gap-2.5 px-4 py-3 min-h-[52px]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
           className="w-4 h-4 shrink-0 text-text-muted">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
      <span className="text-[13px] text-text-muted">
        {text}<span className="font-mono">{dots}</span>
      </span>
    </div>
  )
}

function getScheduleDayType(date: Date): 'H' | 'C' | 'P' {
  const day = date.getDay()
  if (day === 0) return 'P'
  if (day === 6) return 'C'
  return 'H'
}

function minutesToNextDeparture(schedule: ScheduledDeparture[], dayType: 'H' | 'C' | 'P', direction: string, now: Date): number | null {
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  let best: number | null = null
  for (const row of schedule) {
    if (row.day_type !== dayType || row.direction !== direction) continue
    const [h, m] = row.departure_time.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue
    const delta = (h * 60 + m) - minutesNow
    if (delta < 0) continue
    if (best === null || delta < best) best = delta
  }
  return best
}

function RouteTickerRow({ code, name, icon }: { code: string; name: string; icon: string }) {
  const navigate = useNavigate()
  const nowMs = useSharedRouteTickerNowMs()
  const { data, loading } = useRouteTickerData(code)

  const ticker = useMemo(() => {
    if (!data) return [] as Array<{ dir: string; label: string; eta: string; etaMinutes: number | null }>
    const { schedule, metadata } = data
    const dayType = getScheduleDayType(new Date(nowMs))
    const hasMetadata = !!metadata?.length
    const dirs = [...new Set(schedule.filter((s) => s.day_type === dayType).map((s) => s.direction))]
      .sort((a, b) => (a === 'D' ? -1 : b === 'D' ? 1 : a.localeCompare(b)))
      .slice(0, 2)

    return dirs.map((dir) => {
      const mins = minutesToNextDeparture(schedule, dayType, dir, new Date(nowMs))
      const eta = mins === null ? '--' : mins > 30 ? '30+' : `${mins}dk`
      return { dir, label: getDirectionLabel(dir, metadata, hasMetadata), eta, etaMinutes: mins }
    })
  }, [data, nowMs])

  return (
    <button
      onClick={() => navigate(`/routes/${code}`)}
      className="w-full px-4 py-2.5 min-h-[64px] bg-surface-card active:bg-surface-muted transition-colors text-left"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-base shrink-0 leading-none">{icon}</span>
        <span className="flex-1 text-[13px] font-bold text-text-primary truncate leading-tight">{name}</span>
        <svg className="w-3.5 h-3.5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      <div className="mt-0.5 pl-[26px]">
        <span className="text-[10px] font-mono text-text-muted">{code}</span>
      </div>

      <div className="mt-1 pl-[26px] flex items-center gap-x-2.5 min-h-[18px] overflow-hidden whitespace-nowrap">
        {loading && ticker.length === 0 ? (
          <>
            <span className="w-20 h-4 rounded-full bg-surface-muted animate-pulse" />
            <span className="w-20 h-4 rounded-full bg-surface-muted animate-pulse opacity-50" />
          </>
        ) : ticker.length > 0 ? (
          ticker.map((t) => {
            const color = t.etaMinutes === null ? 'text-text-muted' : etaTextClass(Math.min(t.etaMinutes, 30))
            return (
              <span key={`${code}-${t.dir}`} className={`text-[11px] font-bold font-mono ${color} max-w-[48%] truncate`}>
                {t.label}:{t.eta}
              </span>
            )
          })
        ) : (
          <span className="text-[11px] text-text-muted">—</span>
        )}
      </div>
    </button>
  )
}

export default function Home() {
  const { t } = useTranslation()
  const { data: globalNotices } = useGlobalNotices()
  const navigate = useNavigate()
  const { prefs, setGpsConsent } = useUserPrefs()
  const { pinnedStops } = prefs
  const { favorites } = useFavorites()
  const favStops = favorites.filter((f) => f.kind === 'stop')
  const favRoutes = favorites.filter((f) => f.kind === 'route')

  // ── Recent searches ───────────────────────────────────────────────────────
  const [recents, setRecents] = useState<RecentSearch[]>([])
  useEffect(() => { setRecents(getRecent()) }, [])

  // ── Nearest stops (via LocationManager) ───────────────────────────────────
  const { location, loading: gpsLoading } = useLocationManager()
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const fetchNearby = useCallback(() => {
    if (!location) return
    const abort = new AbortController()
    setApiLoading(true)
    setApiError(null)
    api.stops.nearby(location[0], location[1], 15, 500, { signal: abort.signal })
      .then(stops => {
        setNearbyStops(
          [...stops]
            .sort((a, b) => (Number(a.distance_m) || 0) - (Number(b.distance_m) || 0))
            .slice(0, 5),
        )
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error(err)
        setApiError('Duraklar yüklenemedi.')
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setApiLoading(false)
        }
      })
    return abort
  }, [location])

  useEffect(() => {
    const abort = fetchNearby()
    return () => abort?.abort()
  }, [fetchNearby])

  return (
    <PullToRefresh onRefresh={async () => { window.location.reload(); await new Promise(r => setTimeout(r, 600)); }}>
      <div className="pb-4">

      {/* ── Title bar ────────────────────────────────────────────────────────── */}
      <div className="px-4 safe-area-pt mt-8 pt-4 pb-3 flex items-center justify-between border-b border-surface-border">
        <span className="text-xl font-bold text-text-primary tracking-tight">iett-pwa</span>
        <div className="flex items-center gap-2">
          {pkg.version.startsWith('0.') && (
            <span className="bg-amber-500/20 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Beta</span>
          )}
          <span className="text-text-muted font-mono text-xs">v{pkg.version}</span>
        </div>
      </div>

      {/* ── Global Notices ───────────────────────────────────────────────────── */}
      {globalNotices && globalNotices.length > 0 && (
        <div className="px-4 py-3 border-b border-surface-border bg-amber-950/10">
          <div className="flex flex-col gap-2">
            {globalNotices.map((notice) => (
              <div key={notice.notice_noticeid} className="card border-amber-800/40 bg-amber-900/10 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-bold text-amber-500 leading-tight mb-1">{notice.notice_title}</h3>
                    <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{notice.notice_body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pinned stops ─────────────────────────────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <span className="metro-section p-0">{t('home.pinnedStops', { defaultValue: 'Sabitlenmiş Duraklar' })}</span>
          <div className="flex items-center gap-3">
            {pinnedStops.length > 0 && (
              <Link to="/pinned" className="text-[11px] metro-tilt text-text-muted">{t('home.manage', { defaultValue: 'Yönet →' })}</Link>
            )}
            {pinnedStops.length < PINNED_STOPS_MAX && (
              <button
                onClick={() => navigate('/search')}
                className="text-[11px] metro-tilt"
                style={{ color: 'var(--wp-accent)' }}
              >
                {t('home.add', { defaultValue: '+ Ekle' })}
              </button>
            )}
          </div>
        </div>

        {pinnedStops.length > 0 ? (
          <div>
            {pinnedStops.map((p: PinnedStop) => (
              <PinnedStopRow key={p.dcode} dcode={p.dcode} nick={p.nick} icon="📌" />
            ))}
          </div>
        ) : (
          <button
            onClick={() => navigate('/search')}
            className="mx-4 w-[calc(100%-2rem)] py-6 flex flex-col items-center gap-2 metro-tilt"
            style={{ border: '1px solid #222', color: '#444' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm">{t('home.pinStopTitle', { defaultValue: 'Durak sabitle' })}</span>
            <span className="text-xs text-text-muted">{t('home.pinStopDesc', { defaultValue: 'Durak sayfasındaki 📌 butonuna dokun' })}</span>
          </button>
        )}
      </section>

      {/* ── Nearest stops ──────────────────────────────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="metro-section p-0">{t('home.nearbyStops', { defaultValue: 'Yakın Duraklar' })}</span>
          <Link
            to="/nearby"
            className="text-[11px] metro-tilt"
            style={{ color: 'var(--wp-accent)' }}
          >
            {t('home.seeAll', { defaultValue: 'Tümünü Gör →' })}
          </Link>
        </div>

        {/* Locating animation */}
        {gpsLoading ? (
          <LoadingDots text={t('common.locating', { defaultValue: 'Konum alınıyor' })} />
        ) : apiLoading ? (
          <LoadingDots text={t('common.loadingStops', { defaultValue: 'Duraklar yükleniyor' })} />
        ) : apiError ? (
          <div className="mx-4 py-5 flex flex-col items-center gap-2" style={{ border: '1px solid #222', borderRadius: '12px' }}>
            <span className="text-sm text-red-400">{apiError}</span>
            <button
              onClick={() => fetchNearby()}
              className="px-4 py-1.5 bg-surface-muted hover:bg-slate-700 text-text-primary rounded-lg text-xs font-semibold transition-colors"
            >
              {t('common.retry', { defaultValue: 'Tekrar Dene' })}
            </button>
          </div>
        ) : nearbyStops.length > 0 ? (
          nearbyStops.map((s) => (
            <PinnedStopRow
              key={s.stop_code}
              dcode={s.stop_code}
              nick={s.stop_name}
              icon="📍"
              distLabel={distanceLabel(s.distance_m)}
              direction={s.direction}
            />
          ))
        ) : (
          <div className="mx-4 py-5 flex flex-col items-center gap-1.5" style={{ border: '1px solid #222' }}>
            <span className="text-sm text-text-muted">{t('home.noNearby', { defaultValue: 'Durak Bulunamadı' })}</span>
            <span className="text-xs text-text-muted">{t('home.noNearbyDesc', { defaultValue: 'Bulunduğunuz konuma yakın İETT durağı yok.' })}</span>
          </div>
        )}
      </section>

      {/* ── Favorites ───────────────────────────────────────────────────────── */}
      {(favStops.length > 0 || favRoutes.length > 0) && (
        <section className="mb-4">
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="metro-section p-0">{t('home.favorites', { defaultValue: 'Favoriler' })}</span>
            <Link to="/favorites" className="text-[11px] metro-tilt" style={{ color: 'var(--wp-accent)' }}>
              {t('home.seeAll', { defaultValue: 'Tümünü Gör →' })}
            </Link>
          </div>

          <div>
            {favStops.slice(0, 3).map((s) => (
              <PinnedStopRow
                key={`fav-stop-${s.dcode}`}
                dcode={s.dcode}
                nick={s.name}
                icon="❤"
              />
            ))}
            {favRoutes.slice(0, 3).map((r) => (
              <RouteTickerRow
                key={`fav-route-${r.hat_kodu}`}
                code={r.hat_kodu}
                name={r.name}
                icon="🚌"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Last searches ────────────────────────────────────────────────────── */}
      {recents.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="metro-section p-0">{t('home.recentSearches', { defaultValue: 'Son Aramalar' })}</span>
            <button
              onClick={() => navigate('/search')}
              className="text-[11px] metro-tilt"
              style={{ color: 'var(--wp-accent)' }}
            >
              {t('home.searchAll', { defaultValue: 'Tümünü Ara →' })}
            </button>
          </div>
          <div>
            {recents.slice(0, 5).map((r) => (
              r.kind === 'stop' ? (
                <PinnedStopRow
                  key={`${r.kind}-${r.code}`}
                  dcode={r.code}
                  nick={r.name}
                  icon="📍"
                />
              ) : (
                <RouteTickerRow
                  key={`${r.kind}-${r.code}`}
                  code={r.code}
                  name={r.name}
                  icon="🚌"
                />
              )
            ))}
          </div>
        </section>
      )}

      {/* ── Hızlı Erişim ─────────────────────────────────────────────────────── */}
      <section>
        <p className="metro-section">{t('home.quickAccess', { defaultValue: 'Hızlı Erişim' })}</p>
        <div>
          <QuickRow
            to="/nearby"
            label={t('home.nearbyStops', { defaultValue: 'Yakın Duraklar' })}
            sub={t('home.nearbyStopsDesc', { defaultValue: 'Konuma yakın durakları gör' })}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            }
          />
          <QuickRow
            to="/pinned"
            label={t('home.managePinned', { defaultValue: 'Sabitlenmiş Durakları Yönet' })}
            sub={t('home.managePinnedDesc', { defaultValue: 'Sabitleme ekle, kaldır veya düzenle' })}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />
          <QuickRow
            to="/favorites"
            label={t('home.manageFavs', { defaultValue: 'Favori Durakları Yönet' })}
            sub={t('home.manageFavsDesc', { defaultValue: 'Favori durak ve hatlarını düzenle' })}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            }
          />
          <QuickRow
            to="/search"
            label={t('nav.search', { defaultValue: 'Arama' })}
            sub={t('home.searchDesc', { defaultValue: 'Hat veya durak ara' })}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            }
          />
          <QuickRow
            to="/map"
            label={t('nav.map', { defaultValue: 'Filo Haritası' })}
            sub={t('home.mapDesc', { defaultValue: 'Tüm otobüsleri haritada gör' })}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            }
          />
          <QuickRow
            to="/settings"
            label={t('nav.settings', { defaultValue: 'Ayarlar' })}
            sub={t('home.settingsDesc', { defaultValue: 'Uygulama ayarları ve veri yönetimi' })}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      </section>

      {prefs.gpsConsent === 'pending' && (
        <LocationConsentModal
          onConfirm={() => setGpsConsent('granted')}
          onDismiss={() => setGpsConsent('denied')}
        />
      )}
      </div>
    </PullToRefresh>
  )
}
