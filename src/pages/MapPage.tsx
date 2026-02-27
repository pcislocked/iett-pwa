import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useFleet } from '@/hooks/useFleet'

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

export default function MapPage() {
  const { data: buses, loading, error } = useFleet()
  const [filter, setFilter] = useState('')

  const filtered = filter.trim()
    ? (buses ?? []).filter((b) =>
        b.route_code?.toLowerCase().includes(filter.toLowerCase()),
      )
    : (buses ?? [])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Filter bar */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xs px-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Hat filtresi (örn: 500T)"
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
        <div className="absolute top-20 left-4 right-4 z-[1001] bg-red-900/80 border
                        border-red-600 rounded-xl px-4 py-2 text-red-200 text-sm">
          Hata: {error}
        </div>
      )}

      <MapContainer
        center={[41.015, 28.98]}
        zoom={11}
        style={{ flex: 1, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {filtered.map((b) => (
          <Marker key={b.kapino} position={[b.latitude, b.longitude]} icon={busIcon}>
            <Popup>
              <strong>{b.kapino}</strong>
              {b.route_code && <><br />Hat: {b.route_code}</>}
              {b.direction && <><br />Yön: {b.direction}</>}
              <br />Hız: {b.speed} km/h
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[1000]">
        <div className="bg-surface-card/90 backdrop-blur px-3 py-1.5 rounded-xl
                        text-xs text-slate-400 border border-surface-muted">
          {filtered.length} araç gösteriliyor
        </div>
      </div>
    </div>
  )
}
