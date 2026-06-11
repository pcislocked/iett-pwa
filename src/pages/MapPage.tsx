import { useState, useRef, useEffect, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import * as L from 'leaflet'
import CanvasMarkers from '@/components/CanvasMarkers'
import { useNavigate } from 'react-router-dom'
import { useFleet } from '@/hooks/useFleet'
import { useQuery } from '@tanstack/react-query'
import { api, type BusDetail, type Garage, type RouteSearchResult, type BusPosition } from '@/api/client'

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  const hasTimezone = /(?:[zZ]|[+\-]\d{2}:\d{2})$/.test(trimmed)
  const parsed = new Date(hasTimezone ? trimmed : `${trimmed}Z`)
  if (Number.isNaN(parsed.getTime()) && !hasTimezone) {
    const fallback = new Date(trimmed)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatAgo(from: Date | null, nowMs: number): string {
  if (!from) return 'â€”'
  const diffSeconds = Math.max(0, Math.floor((nowMs - from.getTime()) / 1000))
  if (diffSeconds < 60) return `${diffSeconds} sn Ã¶nce`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} dk Ã¶nce`
  const diffHours = Math.floor(diffMinutes / 60)
  return `${diffHours} sa Ã¶nce`
}

const FleetMetaBadge = memo(function FleetMetaBadge({
  updatedAt,
}: {
  updatedAt: string | null | undefined
}) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5_000)
    return () => window.clearInterval(id)
  }, [])

  const updatedAtDate = useMemo(() => parseIsoDate(updatedAt), [updatedAt])

  return (
    <div className="bg-surface-card/90 backdrop-blur px-3 py-1.5 rounded-xl
                    text-xs text-slate-400 border border-surface-muted">
      son veri gÃ¼ncelleme: {formatAgo(updatedAtDate, nowMs)}
    </div>
  )
})

const garageIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer">
    <div style="
      background:#92400e;border-radius:3px;width:13px;height:13px;
      border:2px solid #fbbf24;
      box-shadow:0 2px 6px rgba(0,0,0,0.6)">
    </div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const busIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer">
    <div style="
      background:#2563eb;border-radius:50%;width:12px;height:12px;
      border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 0 0 3px rgba(37,99,235,0.35),0 2px 4px rgba(0,0,0,0.4)">
    </div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})



export default function MapPage() {
  const navigate = useNavigate()
  const { data: buses, loading, error, refresh } = useFleet()

  const { data: fleetMeta, refetch: refreshFleetMeta } = useQuery<{ bus_count: number; updated_at: string | null }>({
    queryKey: ['fleetMeta'],
    queryFn: () => api.fleet.meta(),
    refetchInterval: 15_000,
  })

  const { data: garages } = useQuery<Garage[]>({
    queryKey: ['garages'],
    queryFn: () => api.garages.list(),
    refetchInterval: 86_400_000, // 24 h â€” garages rarely change
  })

  const [showErrorModal, setShowErrorModal] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (error) {
      previousFocusRef.current = document.activeElement as HTMLElement
      setShowErrorModal(true)
    }
  }, [error])

  // â”€â”€ Route filter: autocomplete search + chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!showErrorModal) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
        previousFocusRef.current = null
      }
      return
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowErrorModal(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showErrorModal])

  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const selectedRoutesRef = useRef(selectedRoutes)
  useEffect(() => { selectedRoutesRef.current = selectedRoutes }, [selectedRoutes])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RouteSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Per-route bus fetch: hat_kodu â†’ BusPosition[]
  const [routeBusMap, setRouteBusMap] = useState<Map<string, BusPosition[]>>(new Map())
  const inFlight = useRef<Set<string>>(new Set())
  const fetchIdMap = useRef<Map<string, number>>(new Map())
  const fetchIdCounter = useRef(0)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchBuses = () => {
      if (!isMounted) return
      for (const route of selectedRoutes) {
        if (inFlight.current.has(route)) continue
        
        fetchIdCounter.current += 1
        const currentFetchId = fetchIdCounter.current
        fetchIdMap.current.set(route, currentFetchId)

        inFlight.current.add(route)
        api.routes.buses(route, { signal: controller.signal })
          .then((bs: BusPosition[]) => {
            inFlight.current.delete(route)
            if (!isMounted) return
            if (fetchIdMap.current.get(route) !== currentFetchId) return // Stale request
            if (!selectedRoutesRef.current.includes(route)) return
            setRouteBusMap((prev) => new Map(prev).set(route, bs))
          })
          .catch(() => {
            inFlight.current.delete(route)
            if (!isMounted) return
            if (fetchIdMap.current.get(route) !== currentFetchId) return // Stale request
            if (!selectedRoutesRef.current.includes(route)) return
            setRouteBusMap((prev) => new Map(prev).set(route, []))
          })
      }
    }

    fetchBuses()
    const interval = setInterval(fetchBuses, 15_000)

    // prune deselected routes
    setRouteBusMap((prev) => {
      const next = new Map(prev)
      for (const key of next.keys()) {
        if (!selectedRoutes.includes(key)) {
          next.delete(key)
          inFlight.current.delete(key)
          fetchIdMap.current.delete(key)
        }
      }
      return next
    })

    return () => {
      isMounted = false
      clearInterval(interval)
      controller.abort()
      inFlight.current.clear()
    }
  }, [selectedRoutes])

  // Fetch autocomplete suggestions when query changes (debounced 300 ms)
  useEffect(() => {
    if (searchQuery.trim().length < 1) { setSearchResults([]); return }
    let cancelled = false
    const t = window.setTimeout(() => {
      api.routes.search(searchQuery)
        .then((r) => { if (!cancelled) setSearchResults(r.slice(0, 8)) })
        .catch(() => { if (!cancelled) setSearchResults([]) })
    }, 300)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [searchQuery])

  function addRoute(hatKodu: string) {
    if (!selectedRoutes.includes(hatKodu)) {
      setSelectedRoutes((prev) => [...prev, hatKodu])
    }
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  function removeRoute(hatKodu: string) {
    setSelectedRoutes((prev) => prev.filter((r) => r !== hatKodu))
    setRouteBusMap((prev) => { const n = new Map(prev); n.delete(hatKodu); return n })
  }

  // â”€â”€ Kapino / plate chip filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [entityQuery, setEntityQuery] = useState('')
  const [showEntityDropdown, setShowEntityDropdown] = useState(false)
  const entityDropdownRef = useRef<HTMLDivElement>(null)

  const entityResults = useMemo(() => {
    if (entityQuery.length < 2) return []
    const q = entityQuery.toUpperCase()
    return (buses || []).filter((b) => b.kapino.toUpperCase().includes(q) || (b.plate?.toUpperCase().includes(q) ?? false)).slice(0, 10)
  }, [buses, entityQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (entityDropdownRef.current && !entityDropdownRef.current.contains(e.target as Node)) {
        setShowEntityDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function addEntity(kapino: string) {
    if (!selectedEntities.includes(kapino)) setSelectedEntities((prev) => [...prev, kapino])
    setEntityQuery('')
    setShowEntityDropdown(false)
  }
  function removeEntity(kapino: string) {
    setSelectedEntities((prev) => prev.filter((e) => e !== kapino))
  }

  const hasFilter = selectedRoutes.length > 0 || selectedEntities.length > 0

  // â”€â”€ Selected bus detail (fetched on marker click) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedKapino, setSelectedKapino] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<BusDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!selectedKapino) { setSelectedDetail(null); return }
    let alive = true
    const controller = new AbortController()
    setDetailLoading(true)
    setSelectedDetail(null)
    api.fleet.detail(selectedKapino, { signal: controller.signal })
      .then((d) => { if (alive) { setSelectedDetail(d); setDetailLoading(false) } })
      .catch(() => { if (alive) { setDetailLoading(false) } })
    return () => { alive = false; controller.abort() }
  }, [selectedKapino])

  const selectedBusSnapshot = useMemo(() => {
    if (!selectedKapino || !buses) return null
    return buses.find((b) => b.kapino === selectedKapino) ?? null
  }, [buses, selectedKapino])

  const selectedSpeed = selectedDetail?.speed ?? selectedBusSnapshot?.speed ?? null
  const selectedLastSeen = selectedDetail?.last_seen ?? selectedBusSnapshot?.last_seen ?? null

  const filtered = useMemo(() => {
    const combinedMap = new Map<string, BusPosition>()
    if (buses) {
      for (const b of buses) combinedMap.set(b.kapino, b)
    }
    for (const routeBuses of routeBusMap.values()) {
      for (const b of routeBuses) {
        const existing = combinedMap.get(b.kapino)
        if (!existing || (parseIsoDate(b.last_seen)?.getTime() ?? 0) > (parseIsoDate(existing.last_seen)?.getTime() ?? 0)) {
          combinedMap.set(b.kapino, b)
        }
      }
    }
    
    const all = Array.from(combinedMap.values())
    if (!hasFilter) return all

    const routeKapinos = new Set<string>()
    for (const routeBuses of routeBusMap.values()) {
      for (const b of routeBuses) routeKapinos.add(b.kapino.toUpperCase())
    }

    return all.filter((b) => {
      const kUp = b.kapino.toUpperCase()
      // Route match: kapino lookup first, then fuzzy route_code fallback
      if (selectedRoutes.length > 0) {
        if (routeKapinos.size > 0 && routeKapinos.has(kUp)) return true
        // fallback: route_code field on bus
        if (b.route_code) {
          const rc = b.route_code.toUpperCase()
          for (const sel of selectedRoutes) {
            const hk = sel.toUpperCase()
            if (rc === hk || rc.startsWith(hk + '_') || rc.startsWith(hk + ' ')) return true
          }
        }
      }
      // Kapino / plate match
      if (selectedEntities.length > 0) {
        if (selectedEntities.some((e) => e.toUpperCase() === kUp)) return true
        if (b.plate && selectedEntities.some((e) => e.toUpperCase() === b.plate!.toUpperCase())) return true
      }
      return false
    })
  }, [buses, routeBusMap, selectedRoutes, selectedEntities, hasFilter])

  const busMarkers = useMemo(() => {
    return filtered.map((b) => ({
      position: [b.latitude, b.longitude] as [number, number],
      icon: busIcon,
      onClick: () => setSelectedKapino(b.kapino)
    }))
  }, [filtered])

  return (
    <div className="relative flex flex-col overflow-hidden h-full">
      {/* Filter panel */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 flex flex-col gap-2">
        {/* Route autocomplete search bar */}
        <div
          className="relative"
          ref={dropdownRef}
          onBlur={(e) => {
            if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setShowDropdown(false)
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => { if (searchQuery.length > 0) setShowDropdown(true) }}
            placeholder="Hat kodu ara (Ã¶r: 500T, 14M)â€¦"
            className="w-full border border-[#333] px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:border-[#00AFF0] shadow-xl"
            style={{ background: '#0d0d0d' }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-[#333]
                            shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto"
                 style={{ background: '#0d0d0d' }}>
              {searchResults.map((r) => (
                <button
                  key={r.hat_kodu}
                  onClick={() => { addRoute(r.hat_kodu); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm
                             flex items-center gap-2 transition-colors"
                  style={{ borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="font-mono font-bold text-brand-400 text-xs shrink-0">{r.hat_kodu}</span>
                  <span className="text-slate-300 truncate">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected route chips */}
        {selectedRoutes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedRoutes.map((route) => (
              <span
                key={route}
                className="inline-flex items-center gap-1 bg-brand-900/90 backdrop-blur
                           border border-brand-600/40 text-brand-300 text-xs font-mono
                           font-bold px-2.5 py-1 rounded-full shadow-lg"
              >
                {route}
                <button
                  onClick={() => removeRoute(route)}
                  className="ml-0.5 text-brand-400 hover:text-brand-100 transition-colors
                             leading-none text-sm font-normal"
                  aria-label={`${route} filtresini kaldÄ±r`}
                >
                  Ã—
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Kapino / plate chip filter */}
        <div
          className="relative"
          ref={entityDropdownRef}
          onBlur={(e) => {
            if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setShowEntityDropdown(false)
          }}
        >
          <input
            type="text"
            value={entityQuery}
            onChange={(e) => { setEntityQuery(e.target.value); setShowEntityDropdown(true) }}
            onFocus={() => { if (entityQuery.length > 0) setShowEntityDropdown(true) }}
            placeholder="KapÄ± kodu / plaka ara (Ã¶r: C-1515)"
            className="w-full border border-[#333] px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:border-[#00AFF0] shadow-xl"
            style={{ background: '#0d0d0d' }}
          />
          {showEntityDropdown && entityResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-[#333]
                            shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto"
                 style={{ background: '#0d0d0d' }}>
              {entityResults.map((b) => (
                <button
                  key={b.kapino}
                  onClick={() => { addEntity(b.kapino); setShowEntityDropdown(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm
                             flex items-center gap-2 transition-colors"
                  style={{ borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="font-mono font-bold text-brand-400 text-xs shrink-0">{b.kapino}</span>
                  {b.plate && <span className="text-slate-500 text-xs shrink-0">{b.plate}</span>}
                  {b.route_code && <span className="text-slate-400 truncate text-xs">â†’ {b.route_code}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedEntities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedEntities.map((kapino) => (
              <span
                key={kapino}
                className="inline-flex items-center gap-1 bg-brand-900/90 backdrop-blur
                           border border-brand-600/40 text-brand-300 text-xs font-mono
                           font-bold px-2.5 py-1 rounded-full shadow-lg"
              >
                {kapino}
                <button
                  onClick={() => removeEntity(kapino)}
                  className="ml-0.5 text-brand-400 hover:text-brand-100 transition-colors
                             leading-none text-sm font-normal"
                  aria-label={`${kapino} filtresini kaldÄ±r`}
                >
                  Ã—
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {loading && !buses && (
        <div className="absolute inset-0 flex items-center justify-center z-[999]">
          <div className="bg-surface-card px-6 py-4 rounded-2xl shadow-xl text-slate-300">
            AraÃ§ konumlarÄ± yÃ¼kleniyorâ€¦
          </div>
        </div>
      )}
      
      {showErrorModal && (
        <div 
          className="absolute inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowErrorModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              document.getElementById('ibb-modal-close')?.focus();
            }
          }}
        >
          <div 
            className="bg-surface-card border border-red-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ibb-error-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ibb-error-title" className="text-xl font-bold text-red-400 mb-3">Ä°BB TarafÄ±ndan Engellendi ðŸ›‘</h2>
            <p className="text-slate-300 text-sm mb-4 space-y-3 leading-relaxed">
              <span>Ä°BB YÃ¶netimi, halkÄ±n vergileriyle Ã§alÄ±ÅŸan kamu otobÃ¼slerinin global konum verilerini (TÃ¼m Filo) halka kapatma kararÄ± aldÄ±ÄŸÄ±ndan Ã¶tÃ¼rÃ¼ bu veri ÅŸu an <strong className="text-white">tam anlamÄ±yla saÄŸlanamamaktadÄ±r.</strong></span>
              <br/><br/>
              <span><code>iettnext</code> projesinin de isyan ettiÄŸi gibi: Kamuya ait bir verinin halktan gizlenmesi, kÄ±sÄ±tlÄ± "resmi" kanallara hapsedilmesi; rezalet Google Maps entegrasyonlarÄ±na, Moovit'e el altÄ±ndan yedirilen paralara ve yarrak gibi Ã§alÄ±ÅŸan kendi "OtobÃ¼sÃ¼m Nerede" applerine insanlarÄ± mahkum etmeye Ã§alÄ±ÅŸmalarÄ± kabul edilemez.</span>
              <br/><br/>
              <span>Biz, mÃ¼mkÃ¼n olan legal veya illegal her tÃ¼rlÃ¼ yoldan, koparabildiÄŸimiz kadar veriyi Ã§ekmeye ve bu sansÃ¼rÃ¼ delmeye sonuna kadar devam edeceÄŸiz.</span>
              <br/><br/>
              <span className="text-brand-300 bg-brand-900/30 p-2 rounded block border border-brand-800/50">
                <strong>Not:</strong> Arama Ã§ubuÄŸundan belirli bir hat numarasÄ± (Ã¶rn: 14M) aratarak otobÃ¼sleri haritada <b>gÃ¶rmeye sorunsuzca devam edebilirsiniz.</b> YalnÄ±zca tÃ¼m filonun aynÄ± anda haritada gÃ¶rÃ¼nmesi sabote edilmiÅŸtir.
              </span>
            </p>
            <div className="flex justify-end">
              <button
                id="ibb-modal-close"
                autoFocus
                onClick={() => setShowErrorModal(false)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-5 py-2 rounded-lg font-medium transition-colors"
              >
                AnladÄ±m
              </button>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={[41.015, 28.98]}
        zoom={11}
        style={{ flex: 1, width: '100%', touchAction: 'none' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Garage markers */}
        {(garages ?? []).map((g) => (
            <Marker
            key={g.code ?? g.name}
            position={[g.latitude, g.longitude]}
            icon={garageIcon}
          >
            <Popup minWidth={160}>
              <div className="popup-card">
                <p className="popup-stop-name">{g.name}</p>
                {g.code && <p className="popup-label">#{g.code}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Selected bus route polyline */}
        {selectedDetail && selectedDetail.route_stops.length > 1 && selectedDetail.route_is_live && (() => {
          const dir = selectedDetail.direction_letter ?? 'G'
          const pts = [...selectedDetail.route_stops]
            .filter((s) => s.direction === dir)
            .sort((a, b) => a.sequence - b.sequence)
            .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
            .map((s): [number, number] => [s.latitude, s.longitude])
          return pts.length > 1 ? (
            <Polyline
              positions={pts}
              pathOptions={{ color: '#f97316', weight: 3.5, opacity: 0.85 }}
            />
          ) : null
        })()}

          <CanvasMarkers markers={busMarkers} />
        </MapContainer>

      {/* Selected bus detail card */}
      {selectedKapino && (
        <div className="absolute bottom-16 left-4 right-4 z-[1001] pointer-events-none">
          <div
            className="pointer-events-auto rounded-xl border border-[#333] px-4 py-3 shadow-2xl"
            style={{ background: '#0d0d0d' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-bold text-brand-400 text-sm">{selectedKapino}</span>
                  {selectedDetail?.resolved_route_code && (
                    selectedDetail.route_is_live ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold font-mono"
                        style={{ background: '#f97316', color: '#000' }}
                      >
                        {selectedDetail.resolved_route_code}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Son: {selectedDetail.resolved_route_code}
                      </span>
                    )
                  )}
                  {detailLoading && (
                    <span className="text-[10px] text-slate-500">yÃ¼kleniyorâ€¦</span>
                  )}
                </div>
                {selectedDetail?.direction && (
                  <p className="text-xs text-slate-400 truncate">â†’ {selectedDetail.direction}</p>
                )}
                {selectedDetail?.route_stops && selectedDetail.route_stops.length > 0 && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {selectedDetail.route_stops.filter(s => s.direction === (selectedDetail.direction_letter ?? 'G')).length} durak
                  </p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">HÄ±z</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Son Update (SOAP)</p>
                  <p className="text-xs text-slate-200">{selectedSpeed !== null ? `${selectedSpeed} km/h` : 'â€”'}</p>
                  <p className="text-xs text-slate-200 truncate" title={selectedLastSeen ?? undefined}>{selectedLastSeen ?? 'â€”'}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedKapino(null); setSelectedDetail(null) }}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none shrink-0"
                aria-label="DetaylarÄ± kapat"
                title="DetaylarÄ± kapat"
              >
                Ã—
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-[#1b1b1b] flex items-center justify-end">
              <button
                onClick={() => navigate(`/arac/bus/${encodeURIComponent(selectedKapino)}`)}
                className="metro-tilt px-3 py-1.5 text-xs font-semibold border border-[#2a2a2a]
                           text-[#00AFF0] hover:border-[#00AFF0]/60"
              >
                Daha Fazla Detay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2">
        <FleetMetaBadge updatedAt={fleetMeta?.updated_at} />
        <button
          onClick={() => { refresh(); refreshFleetMeta() }}
          title="Yenile"
          className="bg-surface-card/90 backdrop-blur px-2.5 py-1.5 rounded-xl
                     text-xs text-slate-400 border border-surface-muted hover:text-slate-200 transition-colors"
        >
          â†»
        </button>
        <div className="bg-surface-card/90 backdrop-blur px-3 py-1.5 rounded-xl
                        text-xs text-slate-400 border border-surface-muted">
          {filtered.length.toLocaleString()} araÃ§
          {hasFilter && ` / ${(buses ?? []).length.toLocaleString()} toplam`}
        </div>
      </div>
    </div>
  )
}

