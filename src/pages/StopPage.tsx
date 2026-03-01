import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { useArrivals } from '@/hooks/useArrivals'
import { usePolling } from '@/hooks/usePolling'
import { useFleet } from '@/hooks/useFleet'
import { api, type Announcement, type StopDetail, type BusPosition, type Arrival, type Amenities } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { useBottomBar } from '@/hooks/useBottomBar'
import { useUserPrefs } from '@/hooks/useUserPrefs'

/** Fixed palette for the first 3 routes at this stop — orange, violet, cyan */
const ROUTE_PALETTE = ['#f97316', '#a855f7', '#22d3ee'] as const

function getRouteColor(routeCode: string, orderedRoutes: string[]): string {
  const idx = orderedRoutes.indexOf(routeCode)
  return idx >= 0 && idx < ROUTE_PALETTE.length ? ROUTE_PALETTE[idx] : '#6b7280'
}

function makeBusIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};border-radius:50%;
      width:14px;height:14px;
      border:2px solid #fff;
      box-shadow:0 0 0 3px ${color}55;
      cursor:pointer">
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

/** Haversine distance in metres between two lat/lon points. */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/** Auto-fits map to given bounds on mount. */
function FitBoundsEffect({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap()
  useEffect(() => { map.fitBounds(bounds, { padding: [32, 32] }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Amenity icon row — rendered below the info strip when amenities data is present. */
function AmenityIcons({ amenities }: { amenities: Amenities | null }) {
  if (!amenities) return null
  const items: { label: string; icon: string; value: boolean | null }[] = [
    { label: 'USB', icon: '🔌', value: amenities.usb },
    { label: 'Wi-Fi', icon: '📶', value: amenities.wifi },
    { label: 'Klima', icon: '❄️', value: amenities.ac },
    { label: 'Engelli', icon: '♿', value: amenities.accessible },
  ]
  const known = items.filter((i) => i.value !== null)
  if (known.length === 0) return null
  return (
    <div className="px-4 pb-2 flex gap-3 justify-center flex-wrap">
      {known.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            item.value
              ? 'bg-emerald-900/50 text-emerald-400'
              : 'bg-surface-muted text-slate-600 line-through'
          }`}
        >
          {item.icon} {item.label}
        </span>
      ))}
    </div>
  )
}

/** Bottom-sheet showing a single bus relative to the stop. */
function BusDetailSheet({
  arrival,
  busPos,
  stopLat,
  stopLon,
  stopName: _stopName,
  onClose,
}: {
  arrival: Arrival
  busPos: BusPosition | null
  stopLat: number
  stopLon: number
  stopName: string
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prefer live position from ntcapi ybs arrival; fall back to fleet-store busPos.
  const effectiveLat = arrival.lat ?? busPos?.latitude ?? null
  const effectiveLon = arrival.lon ?? busPos?.longitude ?? null
  const hasPosition = effectiveLat !== null && effectiveLon !== null

  const dist =
    hasPosition ? haversineM(effectiveLat!, effectiveLon!, stopLat, stopLon) : null
  const distLabel =
    dist !== null
      ? dist < 1000
        ? `${Math.round(dist)} m`
        : `${(dist / 1000).toFixed(1)} km`
      : null

  const mapCenter: [number, number] = hasPosition
    ? [(effectiveLat! + stopLat) / 2, (effectiveLon! + stopLon) / 2]
    : [stopLat, stopLon]

  const bounds: [[number, number], [number, number]] | null = hasPosition
    ? [
        [Math.min(effectiveLat!, stopLat), Math.min(effectiveLon!, stopLon)],
        [Math.max(effectiveLat!, stopLat), Math.max(effectiveLon!, stopLon)],
      ]
    : null

  const busIcon = L.divIcon({
    className: '',
    html: `<div style="background:#f97316;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 0 0 3px rgba(249,115,22,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  const stopIcon = L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

  return (
    <div className="fixed inset-0 z-[500] flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl mx-auto bg-surface-card border-t border-surface-muted rounded-t-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div
            className="text-white font-mono font-bold text-sm rounded-xl px-3 py-1.5 shrink-0"
            style={{ backgroundColor: arrival.route_code ? '#f97316' : '#6b7280' }}
          >
            {arrival.route_code}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{arrival.destination}</p>
            {(arrival.plate || arrival.kapino) && (
              <p className="text-xs text-slate-400 font-mono">
                {[arrival.plate, arrival.kapino].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map — bus ↔ stop */}
        {hasPosition ? (
          <div style={{ height: 200 }}>
            <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                attribution='&copy; CartoDB'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {bounds && <FitBoundsEffect bounds={bounds} />}
              <Polyline
                positions={[[effectiveLat!, effectiveLon!], [stopLat, stopLon]]}
                pathOptions={{ color: '#f97316', weight: 2, dashArray: '6 4', opacity: 0.7 }}
              />
              <Marker position={[effectiveLat!, effectiveLon!]} icon={busIcon} />
              <Marker position={[stopLat, stopLon]} icon={stopIcon} />
            </MapContainer>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-center">
            <p className="text-xs text-slate-500">Araç konumu henüz mevcut değil</p>
          </div>
        )}

        {/* Info strip — 4 cols: ETA · Mesafe · Hız · Plaka */}
        <div className="px-4 py-3 grid grid-cols-4 gap-2 border-t border-surface-muted">
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">ETA</p>
            <p className="text-base font-bold text-slate-100">
              {arrival.eta_minutes !== null ? `${arrival.eta_minutes} dk` : arrival.eta_raw}
            </p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mesafe</p>
            <p className="text-base font-bold text-slate-100">{distLabel ?? '—'}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Hız</p>
            <p className="text-base font-bold text-slate-100">
              {arrival.speed_kmh !== null ? `${arrival.speed_kmh} km/h` : '—'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Plaka</p>
            <p className="text-sm font-bold text-slate-100 font-mono">{arrival.plate ?? '—'}</p>
          </div>
        </div>

        {/* Amenity icons */}
        <AmenityIcons amenities={arrival.amenities} />

        {/* CTA */}
        <div className="px-4 pb-6 pt-2">
          <Link
            to={`/routes/${arrival.route_code}`}
            onClick={onClose}
            className="block w-full text-center bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Hattı Aç →
          </Link>
        </div>
      </div>
    </div>
  )
}

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
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null)
  const [activeTab, setActiveTab] = useState<'gelis' | 'hatlar' | 'bilgi'>('gelis')

  // Memoised so useBottomBar’s effect only fires when tab active-state actually changes
  const bottomBarTabs = useMemo(() => [
    {
      label: 'Geliş',
      icon: (
        <svg viewBox="0 0 24 24" fill={activeTab === 'gelis' ? 'currentColor' : 'none'}
             stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
      onPress: () => setActiveTab('gelis'),
      active: activeTab === 'gelis',
    },
    {
      label: 'Hatlar',
      icon: (
        <svg viewBox="0 0 24 24" fill={activeTab === 'hatlar' ? 'currentColor' : 'none'}
             stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
      onPress: () => setActiveTab('hatlar'),
      active: activeTab === 'hatlar',
    },
    {
      label: 'Bilgi',
      icon: (
        <svg viewBox="0 0 24 24" fill={activeTab === 'bilgi' ? 'currentColor' : 'none'}
             stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      onPress: () => setActiveTab('bilgi'),
      active: activeTab === 'bilgi',
    },
  ], [activeTab])

  useBottomBar(bottomBarTabs)

  const { data: arrivals, loading, error, stale } = useArrivals(dcode ?? '')

  const { data: routes } = usePolling<string[]>(
    useMemo(() => () => api.stops.routes(dcode ?? ''), [dcode]),
    300_000,
  )

  const { data: stopDetail } = usePolling<StopDetail>(
    useMemo(() => () => api.stops.detail(dcode ?? ''), [dcode]),
    3_600_000,
  )

  // Ordered unique routes from live arrivals (used for colour assignment)
  const arrivalRouteOrder = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const a of (arrivals ?? [])) {
      if (!seen.has(a.route_code)) { seen.add(a.route_code); result.push(a.route_code) }
    }
    return result
  }, [arrivals])

  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.
  const { data: allBuses } = useFleet()

  // Filter fleet to only buses whose route is present at this stop.
  const routeBuses = useMemo(
    () => (allBuses ?? []).filter((b) => b.route_code && arrivalRouteOrder.includes(b.route_code)),
    [allBuses, arrivalRouteOrder],
  )

  // One cached Leaflet DivIcon per route_code — avoids creating a new DOM object every render.
  const routeIconMap = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    arrivalRouteOrder.forEach((r) => {
      m.set(r, makeBusIcon(getRouteColor(r, arrivalRouteOrder)))
    })
    return m
  }, [arrivalRouteOrder])

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
  const { isPinned, pinStop, unpinStop } = useUserPrefs()
  const stopName = stopDetail?.name ?? `Durak ${dcode}`
  const favItem = { kind: 'stop' as const, dcode: dcode ?? '', name: stopName }
  const favorited = isFavorite(favItem)
  const pinned = isPinned(dcode ?? '')

  const toggleRoute = useCallback((r: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }, [])

  // Arrivals filtered by selected routes (pills only affect the list, not the map)
  const filteredArrivals = useMemo(
    () =>
      activeRoutes.size > 0
        ? (arrivals ?? []).filter((a) => activeRoutes.has(a.route_code))
        : (arrivals ?? []),
    [arrivals, activeRoutes],
  )

  // Fetch live bus positions for ALL routes present in arrivals (up to MAX_LIVE_ROUTES).
  // Index routeBuses by kapino for O(1) lookup in each arrival row.
  const busByKapino = useMemo(() => {
    const m = new Map<string, BusPosition>()
    routeBuses.forEach((b) => m.set(b.kapino, b))
    return m
  }, [routeBuses])

  // ETA lookup by kapino (from all arrivals, not just filtered)
  const etaByKapino = useMemo(() => {
    const m = new Map<string, number | null>()
    ;(arrivals ?? []).forEach((a) => { if (a.kapino) m.set(a.kapino, a.eta_minutes) })
    return m
  }, [arrivals])

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
            {stopDetail && stopDetail.direction && (
              <p className="text-[11px] text-slate-500 truncate leading-tight">{stopDetail.direction}</p>
            )}
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

          <button
            onClick={() => {
              if (!dcode) return
              if (pinned) unpinStop(dcode)
              else pinStop(dcode, stopName)
            }}
            disabled={!dcode}
            aria-label={pinned ? 'Sabitlemeyi kaldır' : 'Ana sayfaya sabitle'}
            aria-pressed={pinned}
            title={pinned ? 'Sabitlemeyi kaldır' : 'Ana sayfaya sabitle'}
            className={`p-1.5 rounded-xl transition-colors shrink-0 disabled:opacity-40 ${
              pinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="text-base leading-none">{pinned ? '📌' : '📍'}</span>
          </button>
        </div>
      </div>

{/* ── Hatlar tab ────────────────────────────────────────────────────── */}
      {activeTab === 'hatlar' && (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {routes === null ? (
            <p className="text-center text-slate-500 mt-10 text-sm">Yükleniyor...</p>
          ) : routes.length === 0 ? (
            <p className="text-center text-slate-500 mt-10 text-sm">Bu durakta kayıtlı hat bulunamadı.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
              {(routes ?? []).map((r) => (
                <button
                  key={r}
                  onClick={() => navigate(`/routes/${r}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted
                             active:bg-surface-muted transition-colors text-left"
                >
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded font-mono text-white"
                    style={{ backgroundColor: getRouteColor(r, arrivalRouteOrder) }}
                  >
                    {r}
                  </span>
                  <span className="flex-1 text-sm text-slate-300">Hat detayı</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                       className="w-4 h-4 text-slate-600 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bilgi tab ────────────────────────────────────────────────────── */}
      {activeTab === 'bilgi' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card divide-y divide-surface-border overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Durak Kodu</span>
              <span className="font-mono text-sm text-slate-100">{dcode}</span>
            </div>
            {stopDetail?.name && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Ad</span>
                <span className="text-sm text-slate-100 text-right max-w-[60%]">{stopDetail.name}</span>
              </div>
            )}
            {stopDetail?.direction && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Yön</span>
                <span className="text-sm text-slate-100 text-right max-w-[60%]">{stopDetail.direction}</span>
              </div>
            )}
            {stopDetail?.latitude != null && stopDetail?.longitude != null && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Konum</span>
                <span className="font-mono text-xs text-slate-400">
                  {stopDetail.latitude.toFixed(5)}, {stopDetail.longitude.toFixed(5)}
                </span>
              </div>
            )}
          </div>
          {stopDetail && <AmenityIcons amenities={(stopDetail as StopDetail & { amenities?: Amenities }).amenities ?? null} />}
        </div>
      )}

{/* Split-screen body — shown on Geliş tab */}
      {activeTab === 'gelis' && (
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
                radius={14}
                pathOptions={{ color: '#2563eb', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
              >
                <Popup minWidth={160}>
                  <div className="popup-card">
                    <p className="popup-stop-name">{stopName}</p>
                    {stopDetail.direction && (
                      <span className="popup-direction-badge">&#8594; {stopDetail.direction}</span>
                    )}
                    <p className="popup-label">#{dcode}</p>
                  </div>
                </Popup>
              </CircleMarker>
              {/* Live bus markers — coloured per route, icons cached by route */}
              {routeBuses.map((b) => {
                const eta = etaByKapino.get(b.kapino) ?? null
                const color = b.route_code ? getRouteColor(b.route_code, arrivalRouteOrder) : '#6b7280'
                const icon = (b.route_code ? routeIconMap.get(b.route_code) : undefined) ?? makeBusIcon('#6b7280')
                const vehicleLine = [b.plate, b.kapino].filter(Boolean).join('  ·  ')
                return (
                  <Marker key={`${b.kapino}-${b.route_code ?? ''}`} position={[b.latitude, b.longitude]} icon={icon}>
                    <Popup minWidth={160}>
                      <div className="popup-card">
                        <div className="popup-route" style={{ background: color }}>
                          {b.route_code ?? '—'}
                        </div>
                        {b.route_name && <p className="popup-name">{b.route_name}</p>}
                        {eta !== null && (
                          <p className="popup-eta">
                            <span className="popup-label">ETA </span>
                            <strong>{eta} dk</strong>
                          </p>
                        )}
                        <p className="popup-mono">{vehicleLine}</p>
                        {b.direction && (
                          <p className="popup-label" style={{ marginTop: 4 }}>→ {b.direction}</p>
                        )}
                      </div>
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
        </div>

        {/* Arrivals — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2">
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
            const routeColor = getRouteColor(a.route_code, arrivalRouteOrder)
            const hasVehicle = !!(a.kapino || a.plate)
            return (
              <div
                key={`${a.route_code}-${a.destination}-${i}`}
                className="card flex items-stretch gap-0 py-0 overflow-hidden hover:border-slate-500 transition-colors"
              >
                {/* LEFT half — navigate to route page */}
                <Link
                  to={`/routes/${a.route_code}`}
                  className="flex items-center gap-3 flex-1 min-w-0 py-2 px-3"
                >
                  <div
                    style={{ backgroundColor: routeColor }}
                    className="text-white font-mono font-bold text-xs rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shrink-0 leading-tight"
                  >
                    {a.route_code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate leading-snug">{a.destination}</p>
                    {hasVehicle && (
                      <p className="text-xs text-slate-400 mt-0.5 font-mono tracking-wide">
                        {[a.plate, a.kapino].filter(Boolean).join('  ·  ')}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Divider */}
                <div className="w-px bg-surface-muted shrink-0 my-2" />

                {/* RIGHT half — open single-bus sheet */}
                <button
                  onClick={() => setSelectedArrival(a)}
                  className="shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2 hover:bg-surface-muted/50 transition-colors"
                >
                  <EtaChip minutes={a.eta_minutes} raw={a.eta_raw} />
                  <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </button>
              </div>
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

        {/* ── Bottom strip: route filter chips + direction ──────────────────
            Persistently visible; top 3 routes carry their palette colour even
            when not selected.  pb-16 clears the fixed bottom tab bar. */}
        <div className="shrink-0 border-t border-surface-muted bg-surface-card pb-16">
          {stopDetail?.direction && (
            <div className="px-4 pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-surface-muted px-2 py-0.5 rounded-md">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                {stopDetail.direction}
              </span>
            </div>
          )}
          {(routes ?? []).length > 0 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
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
              {(routes ?? []).map((r) => {
                const color = getRouteColor(r, arrivalRouteOrder)
                const isActive = activeRoutes.has(r)
                const isTop3 =
                  arrivalRouteOrder.includes(r) &&
                  arrivalRouteOrder.indexOf(r) < ROUTE_PALETTE.length
                return (
                  <button
                    key={r}
                    onClick={() => toggleRoute(r)}
                    style={
                      isActive
                        ? { backgroundColor: color, borderColor: color }
                        : isTop3
                        ? { borderColor: color, color, backgroundColor: color + '22' }
                        : {}
                    }
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      isActive
                        ? 'text-white border-transparent'
                        : isTop3
                        ? 'border'
                        : 'bg-surface-muted text-slate-300 border-transparent hover:bg-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Bus detail sheet — rendered outside the scroll container so it overlays everything */}
      {selectedArrival && stopDetail?.latitude != null && stopDetail.longitude != null && (
        <BusDetailSheet
          arrival={selectedArrival}
          busPos={selectedArrival.kapino ? (busByKapino.get(selectedArrival.kapino) ?? null) : null}
          stopLat={stopDetail.latitude}
          stopLon={stopDetail.longitude}
          stopName={stopName}
          onClose={() => setSelectedArrival(null)}
        />
      )}
    </div>
  )
}
