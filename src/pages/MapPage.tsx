import React, { useState, useMemo, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import * as L from 'leaflet'
import { useFleet } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type Garage, type RouteSearchResult } from '@/api/client'

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

/** Parse a comma-separated string into an uppercase Set. */
function parseSet(raw: string): Set<string> {
  return new Set(
    raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
  )
}

export default function MapPage() {
  const { data: buses, loading, error, refresh } = useFleet()
  const { data: garages } = usePolling<Garage[]>(
    () => api.garages.list(),
    86_400_000, // 24 h — garages rarely change
  )

  // ── Route filter: autocomplete search + chips ──────────────────────────────
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RouteSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch autocomplete suggestions when query changes
  useEffect(() => {
    if (searchQuery.trim().length < 1) { setSearchResults([]); return }
    let cancelled = false
    api.routes.search(searchQuery)
      .then((r) => { if (!cancelled) setSearchResults(r.slice(0, 8)) })
      .catch(() => { if (!cancelled) setSearchResults([]) })
    return () => { cancelled = true }
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
  }

  const [entityInput, setEntityInput] = useState('')

  const routeSet = useMemo(
    () => new Set(selectedRoutes.map((r) => r.toUpperCase())),
    [selectedRoutes],
  )
  const entitySet = useMemo(() => parseSet(entityInput), [entityInput])
  const hasFilter = routeSet.size > 0 || entitySet.size > 0

  const filtered = useMemo(() => {
    const all = buses ?? []
    if (!hasFilter) return all
    return all.filter((b) => {
      if (routeSet.size > 0 && b.route_code && routeSet.has(b.route_code.toUpperCase())) return true
      if (entitySet.size > 0) {
        if (entitySet.has(b.kapino.toUpperCase())) return true
        if (b.plate && entitySet.has(b.plate.toUpperCase())) return true
      }
      return false
    })
  }, [buses, routeSet, entitySet, hasFilter])

  return (
    <div className="relative flex flex-col overflow-hidden h-full">
      {/* Filter panel */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 flex flex-col gap-2">
        {/* Route autocomplete search bar */}
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => { if (searchQuery.length > 0) setShowDropdown(true) }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Hat kodu ara (ör: 500T, 14M)…"
            className="w-full bg-surface-card/95 backdrop-blur border border-surface-muted
                       rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xl"
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-muted
                            rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.hat_kodu}
                  onMouseDown={() => addRoute(r.hat_kodu)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-muted
                             flex items-center gap-2 transition-colors"
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

        {/* Entity filter (kapino / plate) */}
        <input
          type="text"
          value={entityInput}
          onChange={(e) => setEntityInput(e.target.value)}
          placeholder="Kapı kodu / plaka (virgülle ayır: C-1515)"
          className="w-full bg-surface-card/95 backdrop-blur border border-surface-muted
                     rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xl"
        />
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

        {filtered.map((b) => {
          // Build full trail: historical points + current position
          const trailPositions: [number, number][] = [
            ...(b.trail ?? []).map((p): [number, number] => [p.lat, p.lon]),
            [b.latitude, b.longitude],
          ]
          return (
            <React.Fragment key={b.kapino}>
              {/* Trail polyline — only render if we have history */}
              {trailPositions.length > 1 && (
                <Polyline
                  positions={trailPositions}
                  pathOptions={{ color: '#60a5fa', weight: 2, opacity: 0.55 }}
                />
              )}
              <Marker position={[b.latitude, b.longitude]} icon={busIcon}>
                <Popup minWidth={170}>
                  <div className="popup-card">
                    <div className="popup-route" style={{ background: '#2563eb' }}>
                      {b.kapino}
                    </div>
                    {b.plate && (
                      <p className="popup-mono">{b.plate}</p>
                    )}
                    {b.route_code && (
                      <p className="popup-name">
                        <span className="popup-label">Hat </span>
                        {b.route_code}
                      </p>
                    )}
                    {b.direction && (
                      <p className="popup-name">
                        <span className="popup-label">&#8594; </span>
                        {b.direction}
                      </p>
                    )}
                    <p className="popup-label" style={{ marginTop: 4 }}>
                      {b.speed != null ? `${b.speed} km/h` : '—'}
                      {b.last_seen && ` · ${b.last_seen}`}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Bottom status bar */}
      <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2">
        <button
          onClick={refresh}
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