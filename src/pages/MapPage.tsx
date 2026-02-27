import React, { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import * as L from 'leaflet'
import { useFleet } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type Garage } from '@/api/client'

const garageIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#92400e;border-radius:3px;width:12px;height:12px;
    border:2px solid #fbbf24;
    box-shadow:0 1px 4px rgba(0,0,0,0.6)">
  </div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const busIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#2563eb;border-radius:50%;width:10px;height:10px;
    border:1.5px solid rgba(255,255,255,0.7);
    box-shadow:0 1px 3px rgba(0,0,0,0.5)">
  </div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
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
  const [routeInput, setRouteInput] = useState('')
  const [entityInput, setEntityInput] = useState('')

  const routeSet = useMemo(() => parseSet(routeInput), [routeInput])
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
    <div className="relative flex flex-col overflow-hidden h-[calc(100dvh-3.5rem)]">
      {/* Filter panel */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 flex flex-col gap-2">
        <input
          type="text"
          value={routeInput}
          onChange={(e) => setRouteInput(e.target.value)}
          placeholder="Hat kodu (virgülle ayır: 500T, 14M)"
          className="w-full bg-surface-card/95 backdrop-blur border border-surface-muted
                     rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xl"
        />
        <input
          type="text"
          value={entityInput}
          onChange={(e) => setEntityInput(e.target.value)}
          placeholder="Kapı kodu / plaka (virgülle ayır: C-1515, 34AB123)"
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
            <Popup>
              <div style={{ minWidth: 120 }}>
                <strong style={{ fontSize: 13 }}>{g.name}</strong>
                {g.code && (
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>#{g.code}</div>
                )}
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
                <Popup>
                  <div style={{ minWidth: 140 }}>
                    <strong style={{ fontSize: 15 }}>{b.kapino}</strong>
                    {b.plate && (
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>{b.plate}</div>
                    )}
                    {b.route_code && (
                      <div><span style={{ color: '#94a3b8' }}>Hat: </span>{b.route_code}</div>
                    )}
                    {b.direction && (
                      <div><span style={{ color: '#94a3b8' }}>İstikamet: </span>{b.direction}</div>
                    )}
                    <div>
                      <span style={{ color: '#94a3b8' }}>Hız: </span>
                      {b.speed != null ? `${b.speed} km/h` : '—'}
                    </div>
                    {b.last_seen && (
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>{b.last_seen}</div>
                    )}
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