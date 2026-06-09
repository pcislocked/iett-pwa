import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { useArrivals } from '@/hooks/useArrivals'
import { useQuery } from '@tanstack/react-query'
import { api, type RouteAnnouncement, type StopDetail, type BusPosition, type Arrival, type Amenities } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { useBottomBar } from '@/hooks/useBottomBar'
import { PINNED_STOPS_MAX, useUserPrefs } from '@/hooks/useUserPrefs'
import { etaChipClass } from '@/utils/etaColor'
import { motion, AnimatePresence } from 'framer-motion'



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

/**
 * Fits the map to include the stop marker + up to 3 nearest buses (those
 * already present in `buses`).  Only fires once — the first time buses
 * contains at least one entry.  Falls back to the default center/zoom when
 * no buses have live positions.
 */
function AutoFitBuses({
  stopLat,
  stopLon,
  buses,
  filterKey,
}: {
  stopLat: number
  stopLon: number
  buses: BusPosition[]
  filterKey: string
}) {
  const map = useMap()
  const lastFilterKey = useRef<string | null>(null)
  const hasFitOnce = useRef(false)

  useEffect(() => {
    const withPos = buses.filter((b) => b.latitude != null && b.longitude != null).slice(0, 3)
    
    const isFilterChange = lastFilterKey.current !== filterKey
    const isInitialData = !hasFitOnce.current && withPos.length > 0
    
    if (withPos.length > 0) hasFitOnce.current = true

    if (!isFilterChange && !isInitialData) return

    lastFilterKey.current = filterKey

    if (withPos.length === 0) {
      map.flyTo([stopLat, stopLon], 16, { animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, duration: 0.2 })
      return
    }

    const points: L.LatLngExpression[] = [
      [stopLat, stopLon],
      ...withPos.map((b): L.LatLngExpression => [b.latitude, b.longitude]),
    ]
    const bounds = L.latLngBounds(points)
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, duration: 0.2 })
  }, [filterKey, buses, stopLat, stopLon, map])

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
  const navigate = useNavigate()

  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    const root = document.getElementById('root')
    if (root) root.setAttribute('aria-hidden', 'true')
    
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const firstBtn = dialogRef.current.querySelector('button')
        firstBtn?.focus()
      }
    }, 50)
    return () => {
      clearTimeout(timer)
      if (root) root.removeAttribute('aria-hidden')
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
        return
      }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bus-detail-title"
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
            <p id="bus-detail-title" className="text-sm font-semibold text-slate-100 truncate">{arrival.destination}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              to={`/routes/${arrival.route_code}`}
              onClick={onClose}
              className="block w-full text-center bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Hattı Aç →
            </Link>

            <button
              onClick={() => {
                if (!arrival.kapino) return
                onClose()
                navigate(`/arac/bus/${encodeURIComponent(arrival.kapino)}`)
              }}
              disabled={!arrival.kapino}
              className="w-full text-center border border-[#2a2a2a] text-[#00AFF0] font-semibold
                         py-3 rounded-xl text-sm transition-colors disabled:text-slate-600
                         disabled:border-[#1a1a1a] disabled:cursor-not-allowed hover:border-[#00AFF0]/60"
            >
              Daha Fazla Detay
            </button>
          </div>

          {!arrival.kapino && (
            <p className="text-[11px] text-slate-600 mt-2">
              Bu kayitta kapi kodu yok, Arac detayi acilamiyor.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function EtaChip({ minutes, raw }: { minutes: number | null; raw: string }) {
  const chipCls = etaChipClass(minutes)
  if (minutes === null)
    return (
      <span className="inline-flex items-center justify-center bg-surface-muted text-slate-400 text-xs font-semibold
                        px-2.5 py-1 rounded-full min-w-[52px]">
        {raw}
      </span>
    )
  return (
    <span className={`inline-flex items-center justify-center text-xs font-bold
                      px-2.5 py-1 rounded-full min-w-[52px] ${chipCls}`}>
      {minutes} dk
    </span>
  )
}

const globalRouteIconCache = new Map<string, L.DivIcon>()

export default function StopPage() {
  const { dcode } = useParams<{ dcode: string }>()
  const navigate = useNavigate()
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set())
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null)
  const [activeTab, setActiveTab] = useState<'gelis' | 'hatlar' | 'bilgi'>('gelis')

  // Sliding panel state — map height as percentage of split container
  const mapHeightPctRef = useRef(40)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startY: number; startPct: number } | null>(null)

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startY: e.clientY, startPct: mapHeightPctRef.current }
  }, [])

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !splitContainerRef.current || !mapContainerRef.current) return
    const containerH = splitContainerRef.current.offsetHeight
    const dy = e.clientY - dragState.current.startY
    const deltaPct = (dy / containerH) * 100
    const newPct = Math.min(65, Math.max(15, dragState.current.startPct + deltaPct))
    mapHeightPctRef.current = newPct
    mapContainerRef.current.style.height = `${newPct}%`
    window.dispatchEvent(new Event('resize'))
  }, [])

  const onHandlePointerUp = useCallback(() => { dragState.current = null }, [])

  // Reset to default tab whenever the stop changes (React Router may reuse this component)
  useEffect(() => { setActiveTab('gelis') }, [dcode])

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

  const { data: arrivals, loading, error, stale, refresh: refreshArrivals, lastUpdated } = useArrivals(dcode ?? '')

  const { data: routes } = useQuery<string[]>({
    queryKey: ['routesAtStop', dcode],
    queryFn: () => api.stops.routes(dcode ?? ''),
    refetchInterval: 300_000,
    enabled: !!dcode,
  })

  const { data: stopDetail } = useQuery<StopDetail>({
    queryKey: ['stopDetail', dcode],
    queryFn: () => api.stops.detail(dcode ?? ''),
    refetchInterval: 3_600_000,
    enabled: !!dcode,
  })

  // Ordered unique routes from live arrivals (used for colour assignment)
  const arrivalRouteOrder = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const a of (arrivals ?? [])) {
      if (!seen.has(a.route_code)) { seen.add(a.route_code); result.push(a.route_code) }
    }
    return result
  }, [arrivals])

  const orderedForColors = useMemo(() => {
    if (activeRoutes.size === 0) return arrivalRouteOrder
    return Array.from(activeRoutes)
  }, [activeRoutes, arrivalRouteOrder])

  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.
  // Derive bus positions from arrivals (which already carry lat/lon from YBS response).
  const routeBuses = useMemo<BusPosition[]>(
    () =>
      (arrivals ?? [])
        .filter((a): a is Arrival & { lat: number; lon: number } =>
          a.lat != null && a.lon != null && a.kapino != null,
        )
        .map((a) => ({
          kapino: a.kapino!,
          plate: a.plate ?? null,
          latitude: a.lat,
          longitude: a.lon,
          speed: null,
          operator: null,
          last_seen: '',
          route_code: a.route_code,
          route_name: null,
          direction: null,
          direction_letter: null,
          nearest_stop: null,
          stop_sequence: null,
          trail: [],
        })),
    [arrivals],
  )

  const filteredRouteBuses = useMemo(() => {
    if (activeRoutes.size === 0) return routeBuses
    return routeBuses.filter(b => activeRoutes.has(b.route_code ?? ''))
  }, [routeBuses, activeRoutes])

  // One cached Leaflet DivIcon per route_code — avoids creating a new DOM object every render.
  const routeIconMap = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    const allRouteSet = new Set([...arrivalRouteOrder, ...(routes ?? [])])
    allRouteSet.forEach((r) => {
      const color = getRouteColor(r, orderedForColors)
      const cacheKey = `${r}-${color}`
      if (!globalRouteIconCache.has(cacheKey)) {
        globalRouteIconCache.set(cacheKey, makeBusIcon(color))
      }
      const icon = globalRouteIconCache.get(cacheKey)!
      m.set(r, icon)
    })
    return m
  }, [arrivalRouteOrder, routes, orderedForColors])



  // Announcements for ALL routes present at this stop
  const allRoutesAtStop = useMemo(() => Array.from(new Set([...(Array.isArray(routes) ? routes : []), ...arrivalRouteOrder])).sort(), [routes, arrivalRouteOrder])
  const annsFetcher = useCallback(async ({ signal }: { signal: AbortSignal }) => {
    if (!allRoutesAtStop.length) return []
    try {
      return await api.routes.batchAnnouncements(allRoutesAtStop, { signal })
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      return [{
        route_code: 'SİSTEM',
        route_name: '',
        type: 'Uyarı',
        message: 'Duyurular yüklenirken geçici bir hata oluştu.',
        updated_at: new Date().toLocaleTimeString('tr-TR')
      }] as RouteAnnouncement[]
    }
  }, [allRoutesAtStop])

  const { data: polledAnnouncements } = useQuery<RouteAnnouncement[]>({
    queryKey: ['stopAnnouncements', dcode, allRoutesAtStop.join(',')],
    queryFn: annsFetcher,
    refetchInterval: 300_000,
    enabled: !!dcode && allRoutesAtStop.length > 0,
    placeholderData: (prev) => prev,
  })
  const stopAnnouncements = polledAnnouncements ?? []

  const { isFavorite, toggle } = useFavorites()
  const { prefs, isPinned, pinStop, unpinStop } = useUserPrefs()
  const stopName = stopDetail?.name ?? `Durak ${dcode}`
  const favItem = { kind: 'stop' as const, dcode: dcode ?? '', name: stopName }
  const favorited = isFavorite(favItem)
  const pinned = isPinned(dcode ?? '')
  const pinAtLimit = !pinned && (prefs?.pinnedStops.length ?? 0) >= PINNED_STOPS_MAX

  const toggleRoute = useCallback((r: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }, [])

  // Arrivals filtered by selected routes, sorted ascending by ETA
  const filteredArrivals = useMemo(
    () => {
      const base = activeRoutes.size > 0
        ? (arrivals ?? []).filter((a) => activeRoutes.has(a.route_code))
        : (arrivals ?? [])
      return [...base].sort((a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999))
    },
    [arrivals, activeRoutes],
  )

  // Fetch live bus positions for ALL routes present in arrivals (up to MAX_LIVE_ROUTES).
  // Index routeBuses by kapino for O(1) lookup in each arrival row.
  const busByKapino = useMemo(() => {
    const m = new Map<string, BusPosition>()
    routeBuses.forEach((b) => m.set(b.kapino, b))
    return m
  }, [routeBuses])

  // O(1) arrival lookup by kapino — used by bus map markers to open BusDetailSheet
  const arrivalByKapino = useMemo(() => {
    const m = new Map<string, Arrival>()
    ;(arrivals ?? []).forEach((a) => { if (a.kapino) m.set(a.kapino, a) })
    return m
  }, [arrivals])

  if (!dcode) return null

  return (
    <div className="h-full flex flex-col">
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
              if (pinAtLimit) return
              if (pinned) unpinStop(dcode)
              else pinStop(dcode, stopName)
            }}
            disabled={!dcode || pinAtLimit}
            aria-label={
              pinAtLimit
                ? `En fazla ${PINNED_STOPS_MAX} durak sabitlenebilir`
                : pinned ? 'Sabitlemeyi kaldır' : 'Ana sayfaya sabitle'
            }
            aria-pressed={pinned}
            title={
              pinAtLimit
                ? `En fazla ${PINNED_STOPS_MAX} durak ana sayfaya sabitlenebilir`
                : pinned ? 'Sabitlemeyi kaldır' : 'Ana sayfaya sabitle'
            }
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
          {routes === null || routes === undefined ? (
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
                    style={{ backgroundColor: getRouteColor(r, orderedForColors) }}
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
      <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden max-w-2xl w-full mx-auto min-h-0">

        {/* Map — dynamically sized via drag */}
        <div className="shrink-0 border-b border-surface-muted relative" style={{ height: '50%' }} ref={(el) => { if (el) el.style.height = `${mapHeightPctRef.current}%` }}>
          {stopDetail && stopDetail.latitude != null && stopDetail.longitude != null ? (
            <MapContainer
              center={[stopDetail.latitude, stopDetail.longitude]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              key={dcode}
              attributionControl={false}
            >
              {/* MapResizer removed, relying on resize events */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <AutoFitBuses
                stopLat={stopDetail.latitude}
                stopLon={stopDetail.longitude}
                buses={filteredRouteBuses}
                filterKey={Array.from(activeRoutes).join(',')}
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
              {/* Live bus markers — clicking opens the rich BusDetailSheet */}
              {filteredRouteBuses.map((b) => {
                const icon = (b.route_code ? routeIconMap.get(b.route_code) : undefined) ?? makeBusIcon('#6b7280')
                return (
                  <Marker
                    key={`${b.kapino}-${b.route_code ?? ''}`}
                    position={[b.latitude, b.longitude]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        const matched = arrivalByKapino.get(b.kapino) ?? null
                        if (matched) setSelectedArrival(matched)
                      },
                    }}
                  />
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

        {/* ── Drag handle ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center justify-center h-5 cursor-row-resize select-none touch-none bg-surface-card border-b border-surface-muted active:bg-surface-muted"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Arrivals — scrollable, items must not shrink */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">
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

          {/* Announcements Accordion */}
          {(stopAnnouncements ?? []).length > 0 && (
            <div className="mb-2">
              <button
                type="button"
                aria-expanded={showAnnouncements}
                aria-controls="announcements-list"
                onClick={() => setShowAnnouncements(!showAnnouncements)}
                className="w-full card flex items-center justify-between text-sm text-amber-400 font-semibold"
              >
                <span>🔔 Duyurular ({(stopAnnouncements ?? []).length})</span>
                <svg className={`w-4 h-4 transition-transform ${showAnnouncements ? 'rotate-180' : ''}`}
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                </svg>
              </button>
              {showAnnouncements && (
                <div id="announcements-list" className="mt-2 flex flex-col gap-2">
                  {(stopAnnouncements ?? []).map((ann) => (
                    <div key={`${ann.route_code}-${ann.type}-${ann.message}-${ann.updated_at}`} className="card border-amber-800/50 bg-amber-950/20">
                      <p className="text-xs font-semibold text-amber-400 mb-1">
                        {ann.route_code && <span className="text-amber-200 mr-1">[{ann.route_code}]</span>}
                        {ann.type}
                      </p>
                      <p className="text-sm text-slate-300">{ann.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{ann.updated_at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredArrivals.map((a, i) => {
              const routeColor = getRouteColor(a.route_code, orderedForColors)
              const hasVehicle = !!(a.kapino || a.plate)
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={`${a.route_code}-${a.destination}-${a.kapino || a.eta_raw || i}`}
                  className="mb-2 shrink-0 card flex items-stretch gap-0 py-0 overflow-hidden hover:border-slate-500 transition-colors"
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
                </motion.div>
              )
            })}
          </AnimatePresence>


        </div>

        {/* ── Bottom strip: last updated + refresh + route filter chips ────── */}
        <div className="shrink-0 border-t border-surface-muted bg-surface-card pb-2">
          {/* Last updated row */}
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-600">
              {lastUpdated
                ? `güncellendi: ${lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'yükleniyor...'}
            </span>
            <button
              onClick={() => refreshArrivals()}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Yenile
            </button>
          </div>

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
                const color = getRouteColor(r, orderedForColors)
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
