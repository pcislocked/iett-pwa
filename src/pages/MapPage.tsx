import { memo, useState, useMemo, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import * as L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { useFleet } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type BusDetail, type Garage, type RouteSearchResult, type BusPosition } from '@/api/client'
import { POLLING } from '@/config/polling'

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
  if (!from) return '—'
  const diffSeconds = Math.max(0, Math.floor((nowMs - from.getTime()) / 1000))
  if (diffSeconds < 60) return `${diffSeconds} sn önce`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} dk önce`
  const diffHours = Math.floor(diffMinutes / 60)
  return `${diffHours} sa önce`
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
      son veri güncelleme: {formatAgo(updatedAtDate, nowMs)}
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
  const { data: fleetMeta, refresh: refreshFleetMeta } = usePolling<{ bus_count: number; updated_at: string | null }>(
    () => api.fleet.meta(),
    POLLING.FLEET_ALL_MS,
  )
  const { data: garages } = usePolling<Garage[]>(
    () => api.garages.list(),
    POLLING.GARAGES_MS,
  )

  // ── Route filter: autocomplete search + chips ──────────────────────────────
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RouteSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedRouteIndex, setHighlightedRouteIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Per-route bus fetch: hat_kodu → kapino set (fleet route_code is unreliable)
  const [routeBusMap, setRouteBusMap] = useState<Map<string, string[]>>(new Map())

  useEffect(() => {
    let alive = true
    for (const route of selectedRoutes) {
      if (routeBusMap.has(route)) continue
      api.routes.buses(route)
        .then((bs: BusPosition[]) => {
          if (!alive) return
          setRouteBusMap((prev) => new Map(prev).set(route, bs.map((b) => b.kapino.toUpperCase())))
        })
        .catch(() => {
          if (!alive) return
          setRouteBusMap((prev) => new Map(prev).set(route, []))
        })
    }
    // prune deselected routes
    setRouteBusMap((prev) => {
      const next = new Map(prev)
      for (const key of next.keys()) if (!selectedRoutes.includes(key)) next.delete(key)
      return next
    })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    setHighlightedRouteIndex(-1)
  }, [searchResults])

  useEffect(() => {
    if (showDropdown && highlightedRouteIndex >= 0 && dropdownRef.current) {
      const listContainer = dropdownRef.current.querySelector('[role="listbox"]')
      if (listContainer) {
        const buttons = listContainer.querySelectorAll('button')
        const activeBtn = buttons[highlightedRouteIndex]
        if (activeBtn) {
          activeBtn.scrollIntoView({ block: 'nearest' })
        }
      }
    }
  }, [highlightedRouteIndex, showDropdown])

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

  // ── Kapino / plate chip filter ─────────────────────────────────────────────
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [entityQuery, setEntityQuery] = useState('')
  const [showEntityDropdown, setShowEntityDropdown] = useState(false)
  const [highlightedEntityIndex, setHighlightedEntityIndex] = useState(-1)
  const entityDropdownRef = useRef<HTMLDivElement>(null)

  const entityResults = useMemo(() => {
    const q = entityQuery.trim().toUpperCase()
    if (q.length < 2 || !buses) return [] as BusPosition[]
    return buses
      .filter((b) => b.kapino.toUpperCase().includes(q) || (b.plate?.toUpperCase().includes(q) ?? false))
      .slice(0, 8)
  }, [entityQuery, buses])

  useEffect(() => {
    setHighlightedEntityIndex(-1)
  }, [entityResults])

  useEffect(() => {
    if (showEntityDropdown && highlightedEntityIndex >= 0 && entityDropdownRef.current) {
      const listContainer = entityDropdownRef.current.querySelector('[role="listbox"]')
      if (listContainer) {
        const buttons = listContainer.querySelectorAll('button')
        const activeBtn = buttons[highlightedEntityIndex]
        if (activeBtn) {
          activeBtn.scrollIntoView({ block: 'nearest' })
        }
      }
    }
  }, [highlightedEntityIndex, showEntityDropdown])

  function addEntity(kapino: string) {
    if (!selectedEntities.includes(kapino)) setSelectedEntities((prev) => [...prev, kapino])
    setEntityQuery('')
    setShowEntityDropdown(false)
  }
  function removeEntity(kapino: string) {
    setSelectedEntities((prev) => prev.filter((e) => e !== kapino))
  }

  const hasFilter = selectedRoutes.length > 0 || selectedEntities.length > 0

  const handleRouteBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setShowDropdown(false)
    }
  }

  const handleRouteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedRouteIndex((prev) => (prev + 1) % searchResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedRouteIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
    } else if (e.key === 'Enter') {
      if (highlightedRouteIndex >= 0 && highlightedRouteIndex < searchResults.length) {
        e.preventDefault()
        addRoute(searchResults[highlightedRouteIndex].hat_kodu)
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleEntityBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setShowEntityDropdown(false)
    }
  }

  const handleEntityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showEntityDropdown || entityResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedEntityIndex((prev) => (prev + 1) % entityResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedEntityIndex((prev) => (prev - 1 + entityResults.length) % entityResults.length)
    } else if (e.key === 'Enter') {
      if (highlightedEntityIndex >= 0 && highlightedEntityIndex < entityResults.length) {
        e.preventDefault()
        addEntity(entityResults[highlightedEntityIndex].kapino)
      }
    } else if (e.key === 'Escape') {
      setShowEntityDropdown(false)
    }
  }

  // ── Selected bus detail (fetched on marker click) ────────────────────────────────
  const [selectedKapino, setSelectedKapino] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<BusDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!selectedKapino) { setSelectedDetail(null); return }
    let alive = true
    setDetailLoading(true)
    setSelectedDetail(null)
    api.fleet.detail(selectedKapino)
      .then((d) => { if (alive) { setSelectedDetail(d); setDetailLoading(false) } })
      .catch(() => { if (alive) { setDetailLoading(false) } })
    return () => { alive = false }
  }, [selectedKapino])

  const selectedBusSnapshot = useMemo(() => {
    if (!selectedKapino || !buses) return null
    return buses.find((b) => b.kapino === selectedKapino) ?? null
  }, [buses, selectedKapino])

  const selectedSpeed = selectedDetail?.speed ?? selectedBusSnapshot?.speed ?? null
  const selectedLastSeen = selectedDetail?.last_seen ?? selectedBusSnapshot?.last_seen ?? null

  const filtered = useMemo(() => {
    const all = buses ?? []
    if (!hasFilter) return all
    // Build kapino set from per-route fetches (primary)
    const routeKapinos = new Set<string>()
    for (const kapinos of routeBusMap.values()) for (const k of kapinos) routeKapinos.add(k)
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

  return (
    <div className="relative flex flex-col overflow-hidden h-full">
      {/* Filter panel */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 flex flex-col gap-2">
        {/* Route autocomplete search bar */}
        <div className="relative" ref={dropdownRef} onBlur={handleRouteBlur}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => { if (searchQuery.length > 0) setShowDropdown(true) }}
            onKeyDown={handleRouteKeyDown}
            placeholder="Hat kodu ara (ör: 500T, 14M)…"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-controls="route-search-results"
            aria-activedescendant={highlightedRouteIndex >= 0 ? `route-opt-${highlightedRouteIndex}` : undefined}
            className="w-full border border-[#333] px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:border-[#00AFF0] shadow-xl"
            style={{ background: '#0d0d0d' }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div
              id="route-search-results"
              role="listbox"
              aria-label="Hat kodu arama sonuçları"
              className="absolute top-full left-0 right-0 mt-1 border border-[#333]
                              shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto"
              style={{ background: '#0d0d0d' }}
            >
              {searchResults.map((r, i) => (
                <button
                  key={r.hat_kodu}
                  role="option"
                  id={`route-opt-${i}`}
                  aria-selected={highlightedRouteIndex === i}
                  onClick={() => addRoute(r.hat_kodu)}
                  className={`w-full text-left px-4 py-2.5 text-sm
                             flex items-center gap-2 transition-colors ${
                               highlightedRouteIndex === i ? 'bg-surface-muted outline-none ring-1 ring-inset ring-brand-500/50' : ''
                             }`}
                  style={{
                    borderBottom: '1px solid #1a1a1a',
                    background: highlightedRouteIndex === i ? '#1a1a1a' : 'transparent'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = highlightedRouteIndex === i ? '#1a1a1a' : 'transparent')}
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
                  aria-label={`${route} filtresini kaldır`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Kapino / plate chip filter */}
        <div className="relative" ref={entityDropdownRef} onBlur={handleEntityBlur}>
          <input
            type="text"
            value={entityQuery}
            onChange={(e) => { setEntityQuery(e.target.value); setShowEntityDropdown(true) }}
            onFocus={() => { if (entityQuery.length > 0) setShowEntityDropdown(true) }}
            onKeyDown={handleEntityKeyDown}
            placeholder="Kapı kodu / plaka ara (ör: C-1515)"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showEntityDropdown}
            aria-haspopup="listbox"
            aria-controls="entity-search-results"
            aria-activedescendant={highlightedEntityIndex >= 0 ? `entity-opt-${highlightedEntityIndex}` : undefined}
            className="w-full border border-[#333] px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:border-[#00AFF0] shadow-xl"
            style={{ background: '#0d0d0d' }}
          />
          {showEntityDropdown && entityResults.length > 0 && (
            <div
              id="entity-search-results"
              role="listbox"
              aria-label="Kapı kodu plaka arama sonuçları"
              className="absolute top-full left-0 right-0 mt-1 border border-[#333]
                              shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto"
              style={{ background: '#0d0d0d' }}
            >
              {entityResults.map((b, i) => (
                <button
                  key={b.kapino}
                  role="option"
                  id={`entity-opt-${i}`}
                  aria-selected={highlightedEntityIndex === i}
                  onClick={() => addEntity(b.kapino)}
                  className={`w-full text-left px-4 py-2.5 text-sm
                             flex items-center gap-2 transition-colors ${
                               highlightedEntityIndex === i ? 'bg-surface-muted outline-none ring-1 ring-inset ring-brand-500/50' : ''
                             }`}
                  style={{
                    borderBottom: '1px solid #1a1a1a',
                    background: highlightedEntityIndex === i ? '#1a1a1a' : 'transparent'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = highlightedEntityIndex === i ? '#1a1a1a' : 'transparent')}
                >
                  <span className="font-mono font-bold text-brand-400 text-xs shrink-0">{b.kapino}</span>
                  {b.plate && <span className="text-slate-500 text-xs shrink-0">{b.plate}</span>}
                  {b.route_code && <span className="text-slate-400 truncate text-xs">→ {b.route_code}</span>}
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
                  aria-label={`${kapino} filtresini kaldır`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {loading && !buses && (
        <div className="absolute inset-0 flex items-center justify-center z-[999]">
          <div className="bg-surface-card px-6 py-4 rounded-2xl shadow-xl text-slate-300">
            Araç konumları yükleniyor…
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-36 left-4 right-4 z-[1001] bg-red-900/80 border
                        border-red-600 rounded-xl px-4 py-2 text-red-200 text-sm">
          Hata: {error}
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

        {filtered.map((b) => (
          <Marker
            key={b.kapino}
            position={[b.latitude, b.longitude]}
            icon={busIcon}
            eventHandlers={{ click: () => setSelectedKapino(b.kapino) }}
          />
        ))}
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
                    <span className="text-[10px] text-slate-500">yükleniyor…</span>
                  )}
                </div>
                {selectedDetail?.direction && (
                  <p className="text-xs text-slate-400 truncate">→ {selectedDetail.direction}</p>
                )}
                {selectedDetail?.route_stops && selectedDetail.route_stops.length > 0 && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {selectedDetail.route_stops.filter(s => s.direction === (selectedDetail.direction_letter ?? 'G')).length} durak
                  </p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Hız</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Son Update (SOAP)</p>
                  <p className="text-xs text-slate-200">{selectedSpeed !== null ? `${selectedSpeed} km/h` : '—'}</p>
                  <p className="text-xs text-slate-200 truncate" title={selectedLastSeen ?? undefined}>{selectedLastSeen ?? '—'}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedKapino(null); setSelectedDetail(null) }}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none shrink-0"
                aria-label="Detayları kapat"
                title="Detayları kapat"
              >
                ×
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
          ↻
        </button>
        <div className="bg-surface-card/90 backdrop-blur px-3 py-1.5 rounded-xl
                        text-xs text-slate-400 border border-surface-muted">
          {filtered.length.toLocaleString()} araç
          {hasFilter && ` / ${(buses ?? []).length.toLocaleString()} toplam`}
        </div>
      </div>
    </div>
  )
}