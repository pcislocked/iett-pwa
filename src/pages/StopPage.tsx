import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet'
import * as L from 'leaflet'
import { useArrivals } from '@/hooks/useArrivals'
import { usePolling } from '@/hooks/usePolling'
import { api, type Announcement, type StopDetail, type BusPosition } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'

const busMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#10b981;border-radius:50%;width:10px;height:10px;border:2px solid #fff;box-shadow:0 0 0 2px rgba(16,185,129,0.4)"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
})

function EtaChip({ minutes, raw }: { minutes: number | null; raw: string }) {
  if (minutes === null) return <span className="eta-chip eta-far">{raw}</span>
  if (minutes < 5)
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold
                        px-2.5 py-1 rounded-full min-w-[52px] justify-center">
        {minutes} dk
      </span>
    )
  if (minutes < 15)
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-bold
                        px-2.5 py-1 rounded-full min-w-[52px] justify-center">
        {minutes} dk
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 bg-surface-muted text-slate-300 text-xs font-semibold
                      px-2.5 py-1 rounded-full min-w-[52px] justify-center">
      {minutes} dk
    </span>
  )
}

export default function StopPage() {
  const { dcode } = useParams<{ dcode: string }>()
  const navigate = useNavigate()
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set())
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [routeBuses, setRouteBuses] = useState<BusPosition[]>([])

  const { data: arrivals, loading, error, stale } = useArrivals(dcode ?? '')

  const { data: routes } = usePolling<string[]>(
    useMemo(() => () => api.stops.routes(dcode ?? ''), [dcode]),
    300_000,
  )

  const { data: stopDetail } = usePolling<StopDetail>(
    useMemo(() => () => api.stops.detail(dcode ?? ''), [dcode]),
    3_600_000,
  )

  // Announcements for the first selected route
  const firstActive = useMemo(() => Array.from(activeRoutes)[0] ?? null, [activeRoutes])
  const { data: announcements } = usePolling<Announcement[]>(
    useMemo(
      () => () => firstActive ? api.routes.announcements(firstActive) : Promise.resolve([]),
      [firstActive],
    ),
    300_000,
  )

  const { isFavorite, toggle } = useFavorites()
  const stopName = stopDetail?.name ?? `Durak ${dcode}`
  const favItem = { kind: 'stop' as const, dcode: dcode ?? '', name: stopName }
  const favorited = isFavorite(favItem)

  function toggleRoute(r: string) {
    setActiveRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  const filteredArrivals = useMemo(
    () =>
      activeRoutes.size > 0
        ? (arrivals ?? []).filter((a) => activeRoutes.has(a.route_code))
        : (arrivals ?? []),
    [arrivals, activeRoutes],
  )

  // Fetch bus positions for all active routes, refresh every 15 s
  useEffect(() => {
    if (activeRoutes.size === 0) { setRouteBuses([]); return }
    let latestReqId = 0
    const fetchBuses = async () => {
      const myReqId = ++latestReqId
      try {
        const results = await Promise.all(
          Array.from(activeRoutes).map((r) => api.routes.buses(r).catch(() => [] as BusPosition[])),
        )
        // Only apply result if no newer request has started (prevents stale overwrites)
        if (myReqId === latestReqId) setRouteBuses(results.flat())
      } catch (err) {
        // Keep previous routeBuses on error to avoid clearing markers on transient failures
        console.error('Failed to fetch buses', err)
      }
    }
    void fetchBuses()
    const tick = () => { void fetchBuses() }
    const id = setInterval(tick, 15_000)
    return () => { latestReqId = Infinity; clearInterval(id) }
  }, [activeRoutes])

  // O(1) ETA lookup by kapino for bus popups
  const etaByKapino = useMemo(() => {
    const m = new Map<string, number | null>()
    filteredArrivals.forEach((a) => { if (a.kapino) m.set(a.kapino, a.eta_minutes) })
    return m
  }, [filteredArrivals])

  if (!dcode) return null

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted shrink-0 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-200 p-1 -ml-1 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 truncate">{stopName}</h1>
              <span className="text-[10px] bg-surface-muted text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                #{dcode}
              </span>
            </div>
            {stale && <p className="text-[11px] text-amber-400">⚠ Son güncelleme başarısız</p>}
          </div>



          <button
            onClick={() => toggle(favItem)}
            className={`p-1.5 rounded-xl transition-colors shrink-0 ${
              favorited ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <svg className="w-5 h-5" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>

        {/* Route pills — multi-select */}
        {(routes ?? []).length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveRoutes(new Set())}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                activeRoutes.size === 0
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-muted text-slate-300 hover:bg-slate-600'
              }`}
            >
              Tümü
            </button>
            {(routes ?? []).map((r) => (
              <button
                key={r}
                onClick={() => toggleRoute(r)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeRoutes.has(r)
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-muted text-slate-300 hover:bg-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

{/* Split-screen body */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-2xl w-full mx-auto">

        {/* Map — top ~40% */}
        <div className="h-[40%] shrink-0 border-b border-surface-muted relative">
          {stopDetail && stopDetail.latitude != null && stopDetail.longitude != null ? (
            <MapContainer
              center={[stopDetail.latitude, stopDetail.longitude]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <CircleMarker
                center={[stopDetail.latitude, stopDetail.longitude]}
                radius={12}
                pathOptions={{ color: '#2563eb', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
              >
                <Popup>
                  <strong>{stopName}</strong>
                  <br />#{dcode}
                </Popup>
              </CircleMarker>
              {/* Live bus markers for selected routes */}
              {routeBuses.map((b) => {
                const eta = etaByKapino.get(b.kapino) ?? null
                return (
                  <Marker key={b.kapino} position={[b.latitude, b.longitude]} icon={busMarkerIcon}>
                    <Popup>
                      <strong>{b.route_code}</strong>
                      {b.route_name && <><br />{b.route_name}</>}
                      {eta !== null && <><br />{eta} dk</>}
                      <br /><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{b.plate ?? b.kapino}</span>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              {!stopDetail ? (
                <>
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs">Konum yükleniyor...</p>
                </>
              ) : (
                <p className="text-xs">Konum verisi yok</p>
              )}
            </div>
          )}
          {/* Hint when no route is selected */}
          {stopDetail && stopDetail.latitude != null && stopDetail.longitude != null && activeRoutes.size === 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-medium px-3 py-1 rounded-full pointer-events-none z-[1000]">
              Otobüsleri görmek için bir hat seç
            </div>
          )}
        </div>

        {/* Arrivals — bottom 60%, scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 flex flex-col gap-2">
          {error && !stale && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {loading && !arrivals && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="card h-12 animate-pulse bg-surface-muted border-0" />
              ))}
            </div>
          )}

          {arrivals && filteredArrivals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <p className="text-sm font-medium">Şu an sefer bilgisi yok</p>
              {activeRoutes.size > 0 && (
                <p className="text-xs mt-1">{Array.from(activeRoutes).join(', ')} hattı için veri bulunamadı</p>
              )}
            </div>
          )}

          {filteredArrivals.map((a, i) => {
            const vehicleId = a.plate ?? a.kapino
            return (
            <Link
              key={`${a.route_code}-${a.destination}-${i}`}
              to={`/routes/${a.route_code}`}
              className="card flex items-center gap-3 py-2 hover:border-slate-500 transition-colors"
            >
              <div className="bg-brand-600 text-white font-mono font-bold text-xs
                              rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shrink-0 leading-tight">
                {a.route_code}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 truncate leading-snug">{a.destination}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {vehicleId ? `${vehicleId}  ·  ` : ''}{a.eta_raw}
                </p>
              </div>
              <EtaChip minutes={a.eta_minutes} raw={a.eta_raw} />
            </Link>
            )
          })}

          {/* Announcements for first selected route */}
          {firstActive && (announcements ?? []).length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowAnnouncements(!showAnnouncements)}
                className="w-full card flex items-center justify-between text-sm text-amber-400 font-semibold"
              >
                <span>🔔 Duyurular ({(announcements ?? []).length})</span>
                <svg className={`w-4 h-4 transition-transform ${showAnnouncements ? 'rotate-180' : ''}`}
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                </svg>
              </button>
              {showAnnouncements && (
                <div className="mt-2 flex flex-col gap-2">
                  {(announcements ?? []).map((ann, idx) => (
                    <div key={idx} className="card border-amber-800/50 bg-amber-950/20">
                      <p className="text-xs font-semibold text-amber-400 mb-1">{ann.type}</p>
                      <p className="text-sm text-slate-300">{ann.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{ann.updated_at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
