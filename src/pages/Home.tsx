import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PinnedStopRow from '@/components/PinnedStopRow'
import { useUserPrefs, type PinnedStop } from '@/hooks/useUserPrefs'
import { getRecent, type RecentSearch } from '@/hooks/useRecentSearches'
import { api, type NearbyStop } from '@/api/client'
import { distanceLabel } from '@/utils/distance'

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

export default function Home() {
  const navigate = useNavigate()
  const clock = useClock()
  const { prefs } = useUserPrefs()
  const { pinnedStops } = prefs

  // ── Recent searches ───────────────────────────────────────────────────────
  const [recents, setRecents] = useState<RecentSearch[]>([])
  useEffect(() => { setRecents(getRecent()) }, [])

  // ── Nearest stops (auto-GPS) ───────────────────────────────────────────────
  const [gpsPhase, setGpsPhase] = useState<GpsPhase>('locating')
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([])

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsPhase('unavailable'); return }
    setGpsPhase('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const stops = await api.stops.nearby(pos.coords.latitude, pos.coords.longitude)
          setNearbyStops(stops.slice(0, 5))
          setGpsPhase('done')
        } catch {
          setGpsPhase('unavailable')
        }
      },
      (err) => { setGpsPhase(err.code === 1 ? 'denied' : 'unavailable') },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => { requestGps() }, [requestGps])

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

      {/* ── Nearest stops ────────────────────────────────────────────────────── */}
      <section className="mb-4">
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

        {/* Loading skeleton */}
        {gpsPhase === 'locating' && (
          <div className="flex flex-col gap-1 px-0">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <div className="w-4 h-4 rounded-full bg-surface-muted animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-40 bg-surface-muted rounded animate-pulse" />
                  <div className="h-2.5 w-24 bg-surface-muted rounded animate-pulse opacity-60" />
                </div>
              </div>
            ))}
          </div>
        )}

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

        {/* GPS denied */}
        {(gpsPhase === 'denied' || gpsPhase === 'unavailable') && (
          <button
            onClick={() => gpsPhase === 'unavailable' ? requestGps() : navigate('/nearby')}
            className="mx-4 w-[calc(100%-2rem)] py-5 flex flex-col items-center gap-2 metro-tilt"
            style={{ border: '1px solid #222', color: '#444' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-sm">
              {gpsPhase === 'denied' ? 'Konum izni yok' : 'Konum alınamadı'}
            </span>
            <span className="text-xs" style={{ color: '#333' }}>
              {gpsPhase === 'denied'
                ? 'Tarayıcı ayarlarından konuma izin ver'
                : 'Yakın durağa manüel git →'}
            </span>
          </button>
        )}
      </section>

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

    </div>
  )
}
