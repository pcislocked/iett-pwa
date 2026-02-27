import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { useRouteBuses } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type RouteStop, type ScheduledDeparture, type Announcement } from '@/api/client'

// Custom bus icon
const busIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#2563eb;border-radius:50%;width:14px;height:14px;
    border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.6)">
  </div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

type Tab = 'map' | 'schedule' | 'alerts' | 'stops'

export default function RoutePage() {
  const { hatKodu } = useParams<{ hatKodu: string }>()
  const [tab, setTab] = useState<Tab>('map')

  const { data: buses, stale } = useRouteBuses(hatKodu ?? '')

  const stopsFetcher = useMemo(() => () => api.routes.stops(hatKodu ?? ''), [hatKodu])
  const scheduleFetcher = useMemo(() => () => api.routes.schedule(hatKodu ?? ''), [hatKodu])
  const announceFetcher = useMemo(() => () => api.routes.announcements(hatKodu ?? ''), [hatKodu])

  const { data: stops } = usePolling<RouteStop[]>(stopsFetcher, 300_000)
  const { data: schedule } = usePolling<ScheduledDeparture[]>(scheduleFetcher, 300_000)
  const { data: announcements } = usePolling<Announcement[]>(announceFetcher, 300_000)

  if (!hatKodu) return null

  const center: [number, number] = buses?.[0]
    ? [buses[0].latitude, buses[0].longitude]
    : [41.015, 28.98]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'map', label: 'Harita' },
    { id: 'schedule', label: 'Sefer' },
    { id: 'alerts', label: 'Duyurular' },
    { id: 'stops', label: 'Duraklar' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-brand-500">{hatKodu}</h1>
        {stale && <span className="text-xs text-amber-400">⚠ eski veri</span>}
        <span className="text-slate-400 text-sm ml-auto">
          {buses?.length ?? 0} aktif araç
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-card rounded-xl p-1 border border-surface-muted">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
              tab === id
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Map tab */}
      {tab === 'map' && (
        <div className="rounded-2xl overflow-hidden border border-surface-muted" style={{ height: 400 }}>
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {/* Route stops */}
            {stops?.map((s) => (
              <CircleMarker
                key={s.stop_code}
                center={[s.latitude, s.longitude]}
                radius={4}
                pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 1 }}
              >
                <Popup>{s.stop_name}</Popup>
              </CircleMarker>
            ))}
            {/* Live buses */}
            {buses?.map((b) => (
              <Marker key={b.kapino} position={[b.latitude, b.longitude]} icon={busIcon}>
                <Popup>
                  <strong>{b.kapino}</strong><br />
                  {b.direction}<br />
                  Hız: {b.speed} km/h
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Schedule tab */}
      {tab === 'schedule' && (
        <div className="card overflow-auto max-h-96">
          {!schedule && <p className="text-slate-400 text-sm">Yükleniyor...</p>}
          {schedule && schedule.length === 0 && (
            <p className="text-slate-500 text-sm">Sefer bilgisi bulunamadı</p>
          )}
          {schedule && schedule.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-surface-muted">
                  <th className="text-left py-2 pr-4">Saat</th>
                  <th className="text-left py-2 pr-4">Yön</th>
                  <th className="text-left py-2">Gün Tipi</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((d, i) => (
                  <tr key={i} className="border-b border-surface-muted/50">
                    <td className="py-1.5 pr-4 font-mono text-brand-400">{d.departure_time}</td>
                    <td className="py-1.5 pr-4 text-slate-300">{d.direction}</td>
                    <td className="py-1.5 text-slate-500">{d.day_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div className="flex flex-col gap-3">
          {!announcements && <p className="text-slate-400 text-sm">Yükleniyor...</p>}
          {announcements?.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">Aktif duyuru yok</p>
          )}
          {announcements?.map((a, i) => (
            <div key={i} className="card border-l-4 border-amber-500">
              <p className="text-xs text-amber-400 mb-1">{a.type} · {a.updated_at}</p>
              <p className="text-sm text-slate-200">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stops tab */}
      {tab === 'stops' && (
        <div className="flex flex-col gap-2">
          {!stops && <p className="text-slate-400 text-sm">Yükleniyor...</p>}
          {stops?.map((s) => (
            <div key={s.stop_code} className="card flex items-center gap-3">
              <span className="font-mono text-brand-500 text-sm w-6 text-right shrink-0">
                {s.sequence}
              </span>
              <span className="text-sm text-slate-200">{s.stop_name}</span>
              <span className="text-xs text-slate-500 ml-auto">{s.stop_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
