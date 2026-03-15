import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PinnedStopRow from '@/components/PinnedStopRow'
import { useUserPrefs, type PinnedStop } from '@/hooks/useUserPrefs'
import { getRecent, type RecentSearch } from '@/hooks/useRecentSearches'
import { api, type NearbyStop } from '@/api/client'
import { distanceLabel } from '@/utils/distance'
import LocationConsentModal from '@/components/LocationConsentModal'

const LOCATION_CONSENT_KEY = 'location-consent'

/** Format current time HH:MM */
function useClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  )
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })),
      10_000,
    )
    return () => clearInterval(id)
  }, [])
  return time
}

type GpsPhase = 'locating' | 'done' | 'denied' | 'unavailable'

function getGeoErrorCode(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err)) return undefined
  const code = (err as { code?: unknown }).code
  return typeof code === 'number' ? code : undefined
}

function getCurrentPositionPromise(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

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
        <div className="text-sm font-medium text-white">{label}</div>
        {sub && <div className="text-xs" style={{ color: 'var(--wp-text-sec)' }}>{sub}</div>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
           className="w-4 h-4 shrink-0" style={{ color: '#444' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </>
  )
  if (to) return <Link to={to} className="metro-row">{inner}</Link>
  return <button onClick={onPress} className="metro-row w-full text-left">{inner}</button>
}

/** Animated "Konum alınıyor" dots: cycles ·  ··  ···  ····  every 400 ms */
function GpsLocatingDots() {
  const [frame, setFrame] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    timerRef.current = setInterval(() => setFrame(f => (f + 1) % 4), 400)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])
  const dots = ['·', '··', '···', '····'][frame]
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 min-h-[52px]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
           className="w-4 h-4 shrink-0 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
      <span className="text-[13px] text-slate-500">
        Konum alınıyor<span className="font-mono">{dots}</span>
      </span>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const clock = useClock()
  const { prefs } = useUserPrefs()
  const { pinnedStops } = prefs

  // ── Recent searches ───────────────────────────────────────────────────────
  const [recents, setRecents] = useState<RecentSearch[]>([])
  useEffect(() => { setRecents(getRecent()) }, [])

  // ── Nearest stops (consent-gated GPS) ─────────────────────────────────────
  const [gpsPhase, setGpsPhase] = useState<GpsPhase>('unavailable')
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([])
  const [showConsentModal, setShowConsentModal] = useState(false)

  const requestGps = useCallback(async () => {
    if (!navigator.geolocation) { setGpsPhase('unavailable'); return }
    setGpsPhase('locating')

    // Some mobile WebView/PWA contexts can intermittently fail to invoke either
    // callback on background/foreground transitions; guard against endless locating.
    const watchdogId = window.setTimeout(() => {
      setGpsPhase((phase) => (phase === 'locating' ? 'unavailable' : phase))
    }, 20_000)

    try {
      let pos: GeolocationPosition
      try {
        // Prefer a fresh fix first so startup behaves like explicit Nearby actions.
        pos = await getCurrentPositionPromise({
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0,
        })
      } catch (firstErr) {
        // Permission denied should not fall back.
        if (getGeoErrorCode(firstErr) === 1) throw firstErr

        // Fallback to a cached/low-power position if fresh GPS is unavailable.
        pos = await getCurrentPositionPromise({
          enableHighAccuracy: false,
          timeout: 8_000,
          maximumAge: 120_000,
        })
      }

      const stops = await api.stops.nearby(pos.coords.latitude, pos.coords.longitude)
      setNearbyStops(
        [...stops]
          .sort((a, b) => (Number(a.distance_m) || 0) - (Number(b.distance_m) || 0))
          .slice(0, 5),
      )
      setGpsPhase('done')
    } catch (err) {
      setGpsPhase(getGeoErrorCode(err) === 1 ? 'denied' : 'unavailable')
    } finally {
      window.clearTimeout(watchdogId)
    }
  }, [])

  const handleConsentConfirm = useCallback(() => {
    try { localStorage.setItem(LOCATION_CONSENT_KEY, 'granted') } catch { /* storage unavailable */ }
    setShowConsentModal(false)
    requestGps()
  }, [requestGps])

  const handleConsentDismiss = useCallback(() => {
    try { localStorage.setItem(LOCATION_CONSENT_KEY, 'dismissed') } catch { /* storage unavailable */ }
    setShowConsentModal(false)
    setGpsPhase('denied')
  }, [])

  useEffect(() => {
    let cancelled = false
    let consent: string | null = null
    try { consent = localStorage.getItem(LOCATION_CONSENT_KEY) } catch { /* storage unavailable */ }

    if (consent === 'dismissed') {
      setGpsPhase('denied')
      return () => { cancelled = true }
    }

    if (consent !== 'granted') {
      // First visit (or storage unavailable) — show consent modal.
      // Do not show locating until an actual GPS request begins.
      setShowConsentModal(true)
      return () => { cancelled = true }
    }

    // Consent is locally granted; verify real browser permission state.
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms || typeof perms.query !== 'function') {
      void requestGps()
      return () => { cancelled = true }
    }

    perms
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled) return
        if (status.state === 'granted') {
          void requestGps()
          return
        }
        if (status.state === 'denied') {
          setGpsPhase('denied')
          return
        }
        // prompt: avoid silent auto-locate hangs; require explicit user confirmation.
        setShowConsentModal(true)
      })
      .catch(() => {
        if (!cancelled) void requestGps()
      })

    return () => { cancelled = true }
  }, [requestGps])

  return (
    <div className="flex-1 overflow-y-auto pb-4">

      {/* ── Title bar ────────────────────────────────────────────────────────── */}
      <div className="px-4 safe-area-pt mt-8 pt-4 pb-3 flex items-center justify-between border-b border-[#111]">
        <span className="text-xl font-bold text-white tracking-tight">iettnin amina koyum</span>
        <span className="text-[#666] tabular-nums text-xs">{clock}</span>
      </div>

      {/* ── Pinned stops ─────────────────────────────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <span className="metro-section p-0">Sabitlenmiş Duraklar</span>
          <div className="flex items-center gap-3">
            {pinnedStops.length > 0 && (
              <Link to="/pinned" className="text-[11px] metro-tilt" style={{ color: '#888' }}>Yönet →</Link>
            )}
            {pinnedStops.length < 4 && (
              <button
                onClick={() => navigate('/search')}
                className="text-[11px] metro-tilt"
                style={{ color: 'var(--wp-accent)' }}
              >
                + Ekle
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
            <span className="text-sm">Durak sabitle</span>
            <span className="text-xs" style={{ color: '#333' }}>Durak sayfasındaki 📌 butonuna dokun</span>
          </button>
        )}
      </section>

      {/* ── Nearest stops ─ hidden when location permission revoked ────────── */}
      {gpsPhase !== 'denied' && <section className="mb-4">
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="metro-section p-0">Yakın Duraklar</span>
          <Link
            to="/nearby"
            className="text-[11px] metro-tilt"
            style={{ color: 'var(--wp-accent)' }}
          >
            Tümünü Gör →
          </Link>
        </div>

        {/* Locating animation */}
        {gpsPhase === 'locating' && <GpsLocatingDots />}

        {/* Stops list */}
        {gpsPhase === 'done' && nearbyStops.map((s) => (
          <PinnedStopRow
            key={s.stop_code}
            dcode={s.stop_code}
            nick={s.stop_name}
            icon="📍"
            distLabel={distanceLabel(s.distance_m)}
            direction={s.direction}
          />
        ))}

        {/* GPS unavailable — retry */}
        {gpsPhase === 'unavailable' && (
          <button
            onClick={requestGps}
            className="mx-4 w-[calc(100%-2rem)] py-5 flex flex-col items-center gap-2 metro-tilt"
            style={{ border: '1px solid #222', color: '#444' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-sm">Konum alınamadı</span>
            <span className="text-xs" style={{ color: '#333' }}>Tekrar dene →</span>
          </button>
        )}
      </section>}

      {/* ── Last searches ────────────────────────────────────────────────────── */}
      {recents.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="metro-section p-0">Son Aramalar</span>
            <button
              onClick={() => navigate('/search')}
              className="text-[11px] metro-tilt"
              style={{ color: 'var(--wp-accent)' }}
            >
              Tümünü Ara →
            </button>
          </div>
          <div>
            {recents.slice(0, 5).map((r) => (
              <button
                key={`${r.kind}-${r.code}`}
                onClick={() =>
                  navigate(r.kind === 'stop' ? `/stops/${r.code}` : `/routes/${r.code}`)
                }
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px]
                           bg-surface-card active:bg-surface-muted transition-colors text-left"
              >
                {r.kind === 'stop' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                       className="w-4 h-4 shrink-0 text-slate-600">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                       className="w-4 h-4 shrink-0 text-slate-600">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-white truncate block">{r.name}</span>
                  <span className="text-[10px] text-slate-600 font-mono">{r.code}</span>
                </div>
                <span className="text-[10px] text-slate-700 shrink-0">
                  {r.kind === 'stop' ? 'Durak' : 'Hat'}
                </span>
                <svg className="w-3.5 h-3.5 text-slate-700 shrink-0 ml-1" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Hızlı Erişim ─────────────────────────────────────────────────────── */}
      <section>
        <p className="metro-section">Hızlı Erişim</p>
        <div>
          <QuickRow
            to="/nearby"
            label="Yakın Duraklar"
            sub="Konuma yakın durakları gör"
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
            label="Sabitlenmiş Durakları Yönet"
            sub="Sabitleme ekle, kaldır veya düzenle"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />
          <QuickRow
            to="/favorites"
            label="Favori Durakları Yönet"
            sub="Favori durak ve hatlarını düzenle"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            }
          />
          <QuickRow
            to="/search"
            label="Arama"
            sub="Hat veya durak ara"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            }
          />
          <QuickRow
            to="/map"
            label="Filo Haritası"
            sub="Tüm otobüsleri haritada gör"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            }
          />
          <QuickRow
            to="/settings"
            label="Ayarlar"
            sub="Uygulama ayarları ve veri yönetimi"
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

      {showConsentModal && (
        <LocationConsentModal
          onConfirm={handleConsentConfirm}
          onDismiss={handleConsentDismiss}
        />
      )}
    </div>
  )
}
