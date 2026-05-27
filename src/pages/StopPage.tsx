import type React from 'react'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { useArrivals } from '@/hooks/useArrivals'
import { usePolling } from '@/hooks/usePolling'
import { api, type Announcement, type StopDetail, type BusPosition, type Arrival, type Amenities } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { useBottomBar } from '@/hooks/useBottomBar'
import { PINNED_STOPS_MAX, useUserPrefs } from '@/hooks/useUserPrefs'
import { etaChipClass } from '@/utils/etaColor'
import { POLLING } from '@/config/polling'

/** Calls map.invalidateSize() whenever the container height percentage changes. */
function MapResizer({ heightPct }: { heightPct: number }) {
  const map = useMap()
  useEffect(() => {
    requestAnimationFrame(() => { map.invalidateSize() })
  }, [heightPct, map])
  return null
}

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



/**
 * Fits the map to include the stop marker + up to 3 nearest buses (those
 * already present in `buses`).  Only fires once — the first time buses
 * contains at least one entry.  Falls back to the default center/zoom when
 * no buses have live positions.
 */
function FitToBusesOnLoad({
  stopLat,
  stopLon,
  buses,
  activeRoutes,
  hasData,
}: {
  stopLat: number
  stopLon: number
  buses: BusPosition[]
  activeRoutes: Set<string>
  hasData: boolean
}) {
  const map = useMap()
  const firedRef = useRef(false)
  const prevRoutesRef = useRef<Set<string>>(activeRoutes)

  useEffect(() => {
    if (prevRoutesRef.current !== activeRoutes) {
      firedRef.current = false
      prevRoutesRef.current = activeRoutes
    }

    if (firedRef.current) return
    if (!hasData) return

    const withPos = buses.filter((b) => b.latitude != null && b.longitude != null).slice(0, 3)
    if (withPos.length === 0 && activeRoutes.size === 0) return

    firedRef.current = true
    const points: L.LatLngExpression[] = [
      [stopLat, stopLon],
      ...withPos.map((b): L.LatLngExpression => [b.latitude, b.longitude]),
    ]
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 })
  }, [buses, stopLat, stopLon, map, activeRoutes, hasData])

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

import BusDetailSheet from '@/components/BusDetailSheet'

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

function InfoModal({ onClose }: { onClose: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    prevFocusRef.current = document.activeElement
    btnRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Basic focus trap: keep focus on button if tab pressed
      if (e.key === 'Tab') {
        e.preventDefault()
        btnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (prevFocusRef.current instanceof HTMLElement) {
        prevFocusRef.current.focus()
      }
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        aria-describedby="info-desc"
        className="bg-surface-card border border-surface-muted rounded-2xl w-full max-w-sm p-5 shadow-xl relative"
      >
        <h2 id="info-title" className="text-base font-bold text-slate-100 mb-3 text-center">Zaman Damgaları</h2>
        <div id="info-desc">
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            Gizliliğinizi korumak ve İETT sistemlerindeki yükü azaltmak için bu uygulama, verileri <strong>pcislocked.net</strong> üzerinden çekerek kısa süreliğine önbellekte tutar. Bu nedenle gördüğünüz ikinci saat, İETT'den alınan en güncel verinin asıl zaman damgasıdır.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Araçların konum bildirme aralıkları, İETT sunucularındaki olağan gecikmeler ve bizim önbellek süremiz birleştiğinde, ekrandaki konum gerçek hayattan 90 saniyeye kadar geride kalabilir. Yine de bu yapı, resmi uygulamaya kıyasla size çok daha hızlı ve akıcı bir deneyim sunar.
          </p>
        </div>
        <button
          ref={btnRef}
          onClick={onClose}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111]"
        >
          Anladım
        </button>
      </div>
    </div>
  )
}

function AnnouncementsModal({ announcements, onClose }: { announcements: (Announcement & { route_code: string })[], onClose: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<Element | null>(null)
  
  useEffect(() => {
    prevFocusRef.current = document.activeElement
    btnRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (prevFocusRef.current instanceof HTMLElement) {
        prevFocusRef.current.focus()
      }
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcements-title"
        className="bg-surface-card border border-surface-muted rounded-2xl w-full max-w-md p-5 shadow-xl relative max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="announcements-title" className="text-base font-bold text-amber-400 flex items-center gap-2">
            <span>🔔</span> Duyurular
          </h2>
          <button onClick={onClose} aria-label="Kapat" className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 space-y-3">
          {announcements.map((ann, idx) => (
            <div key={idx} className="bg-amber-950/20 border border-amber-800/50 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-500 mb-1.5 uppercase tracking-wider">
                Duyuru • {ann.route_code} • {ann.type}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {ann.message}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-surface-muted">
          <button
            ref={btnRef}
            onClick={onClose}
            className="w-full bg-surface-muted hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StopPage() {
  const { dcode } = useParams<{ dcode: string }>()
  const navigate = useNavigate()
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set())
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null)
  const [activeTab, setActiveTab] = useState<'gelis' | 'hatlar' | 'bilgi'>('gelis')
  const [showInfo, setShowInfo] = useState(false)

  // Sliding panel state — map height as percentage of split container
  const [mapHeightPct, setMapHeightPct] = useState(40)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startY: number; startPct: number } | null>(null)

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startY: e.clientY, startPct: mapHeightPct }
  }, [mapHeightPct])

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !splitContainerRef.current) return
    const containerH = splitContainerRef.current.offsetHeight
    const dy = e.clientY - dragState.current.startY
    const deltaPct = (dy / containerH) * 100
    const newPct = Math.min(65, Math.max(15, dragState.current.startPct + deltaPct))
    setMapHeightPct(newPct)
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

  const { data: arrivals, loading, error, stale, refresh: refreshArrivals, lastUpdated, iettUpdated } = useArrivals(dcode ?? '')

  const routesFetcher = useCallback(() => dcode ? api.stops.routes(dcode) : Promise.resolve([]), [dcode])
  const stopDetailFetcher = useCallback(() => dcode ? api.stops.detail(dcode) : Promise.resolve(null), [dcode])

  const { data: routes } = usePolling<string[]>(routesFetcher, POLLING.STOP_ROUTES_MS, dcode)
  const { data: stopDetail } = usePolling<StopDetail | null>(stopDetailFetcher, POLLING.STOP_DETAIL_MS, dcode)

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
  // Derive bus positions from arrivals (which already carry lat/lon from YBS response).
  const routeBuses = useMemo<BusPosition[]>(
    () => {
      const base = activeRoutes.size > 0
        ? (arrivals ?? []).filter((a) => activeRoutes.has(a.route_code))
        : (arrivals ?? [])
      return base
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
        }))
    },
    [arrivals, activeRoutes],
  )

  // One cached Leaflet DivIcon per route_code — avoids creating a new DOM object every render.
  // Build for ALL routes at this stop (arrivalRouteOrder + routes fallback).
  const routeIconMap = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    const allRouteSet = new Set([...arrivalRouteOrder, ...(Array.isArray(routes) ? routes : [])])
    allRouteSet.forEach((r) => {
      m.set(r, makeBusIcon(getRouteColor(r, arrivalRouteOrder)))
    })
    return m
  }, [arrivalRouteOrder, routes])

  type RouteAnnouncement = Announcement & { route_code: string }

  // Announcements for ALL routes present at this stop
  const allRoutesAtStop = useMemo(() => Array.from(new Set([...(Array.isArray(routes) ? routes : []), ...arrivalRouteOrder])), [routes, arrivalRouteOrder])
  const annsFetcher = useCallback(async () => {
    if (!allRoutesAtStop.length) return []
    const combined: RouteAnnouncement[] = []
    
    // Chunk requests to avoid browser connection exhaustion (max 6 concurrent per origin)
    const chunkSize = 5
    for (let i = 0; i < allRoutesAtStop.length; i += chunkSize) {
      const chunk = allRoutesAtStop.slice(i, i + chunkSize)
      const results = await Promise.allSettled(chunk.map(r => api.routes.announcements(r)))
      results.forEach((res, j) => {
        if (res.status === 'fulfilled' && res.value.length > 0) {
          res.value.forEach(a => combined.push({ ...a, route_code: chunk[j] }))
        }
      })
    }
    return combined
  }, [allRoutesAtStop])

  const allRoutesKey = allRoutesAtStop.join(',')
  const { data: polledAnnouncements } = usePolling<RouteAnnouncement[]>(annsFetcher, POLLING.ANNOUNCEMENTS_MS, allRoutesKey)
  const announcements = polledAnnouncements ?? []

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
      <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden max-w-2xl w-full mx-auto min-h-0">

        {/* Map — dynamically sized via drag */}
        <div className="shrink-0 border-b border-surface-muted relative" style={{ height: `${mapHeightPct}%` }}>
          {stopDetail && stopDetail.latitude != null && stopDetail.longitude != null ? (
            <MapContainer
              center={[stopDetail.latitude, stopDetail.longitude]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              key={dcode}
            >
              <MapResizer heightPct={mapHeightPct} />
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <FitToBusesOnLoad
                stopLat={stopDetail.latitude}
                stopLon={stopDetail.longitude}
                buses={routeBuses}
                activeRoutes={activeRoutes}
                hasData={arrivals !== null}
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
              {routeBuses.map((b) => {
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

        {/* ── Announcements (Thin sticky ribbon) ────────────────────────── */}
        {(announcements ?? []).length > 0 && (
          <button
            onClick={() => setShowAnnouncements(true)}
            className="w-full shrink-0 flex items-center justify-between px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-400 font-medium active:bg-amber-500/20 transition-colors"
          >
            <span>{(announcements ?? []).length} Duyuru</span>
            <span className="opacity-80">Görüntüle &rsaquo;</span>
          </button>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3 pb-4">
          {error && !stale && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm mb-2">
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
              </div>
            )
          })}

        </div>

        {/* ── Bottom strip: last updated + refresh + route filter chips ────── */}
        <div className="shrink-0 border-t border-surface-muted bg-surface-card pb-2">
          {/* Last updated row */}
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-mono">
                güncellendi: {lastUpdated ? lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '...'}
                {iettUpdated && `, İETT: ${iettUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              </span>
              {lastUpdated && (
                <button
                  onClick={() => setShowInfo(true)}
                  className="w-3.5 h-3.5 rounded-full border border-slate-600 text-slate-600 flex items-center justify-center hover:bg-slate-700 hover:text-slate-300 transition-colors"
                  aria-label="Neden iki farklı saat var?"
                >
                  <span className="text-[9px] font-bold">i</span>
                </button>
              )}
            </div>
            <button
              onClick={refreshArrivals}
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

      {selectedArrival && stopDetail?.latitude != null && stopDetail.longitude != null && (() => {
        const busPos = selectedArrival.kapino ? (busByKapino.get(selectedArrival.kapino) ?? null) : null;
        const effectiveLat = selectedArrival.lat ?? busPos?.latitude ?? null;
        const effectiveLon = selectedArrival.lon ?? busPos?.longitude ?? null;
        return (
          <BusDetailSheet
            routeCode={selectedArrival.route_code}
            destination={selectedArrival.destination}
            plate={selectedArrival.plate}
            kapino={selectedArrival.kapino}
            etaMinutes={selectedArrival.eta_minutes}
            etaRaw={selectedArrival.eta_raw}
            speedKmh={selectedArrival.speed_kmh}
            showMap={true}
            busLat={effectiveLat}
            busLon={effectiveLon}
            stopLat={stopDetail.latitude}
            stopLon={stopDetail.longitude}
            amenities={selectedArrival.amenities}
            onClose={() => setSelectedArrival(null)}
          />
        )
      })()}
      {/* Info Modal */}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {/* Announcements Modal */}
      {showAnnouncements && (announcements ?? []).length > 0 && (
        <AnnouncementsModal 
          announcements={announcements!} 
          onClose={() => setShowAnnouncements(false)} 
        />
      )}
    </div>
  )
}
