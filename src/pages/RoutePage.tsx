import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import * as L from 'leaflet'
import { useRouteBuses } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type RouteStop, type ScheduledDeparture, type Announcement, type RouteMetadata } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'

const busIcon = L.divIcon({
  className: '',
  html: `<div style="background:#2563eb;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const DAY_TYPES = [
  { key: 'H', label: 'Hafta İçi' },
  { key: 'C', label: 'Cumartesi' },
  { key: 'P', label: 'Pazar' },
]

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 gap-4 text-slate-500">
      <p className="text-sm text-red-400">{message}</p>
      <button type="button" onClick={onRetry}
              className="px-4 py-2 bg-surface-muted rounded-xl text-sm text-slate-300 hover:bg-slate-600 transition-colors">
        Tekrar Dene
      </button>
    </div>
  )
}

function TimetableView({ schedule, scheduleError, onRetry, metadata }: {
  schedule: ScheduledDeparture[] | null
  scheduleError: string | null
  onRetry: () => void
  metadata: RouteMetadata[] | null
}) {
  const [dayType, setDayType] = useState('H')
  const [direction, setDirection] = useState('')

  // Map direction code → human label from metadata
  const dirLabel = useMemo(() => {
    const map: Record<string, string> = {}
    if (metadata) {
      for (const m of metadata) {
        if (m.variant_code && m.direction_name) {
          // SYON is '0' or '1' in some endpoints; store by direction int too
          map[String(m.direction)] = m.direction_name
          map[m.variant_code] = m.direction_name
        }
      }
    }
    return (code: string) => map[code] ?? (code === 'D' ? 'Gidiş' : code === 'G' ? 'Dönüş' : code)
  }, [metadata])

  // Directions available for the current day type
  const availableDirections = useMemo(() => {
    if (!schedule) return [] as string[]
    const seen = new Set<string>()
    for (const d of schedule) {
      if (d.day_type === dayType) seen.add(d.direction)
    }
    return Array.from(seen).sort()
  }, [schedule, dayType])

  // Auto-select first direction when day type changes or schedule loads
  const effectiveDirection = availableDirections.includes(direction)
    ? direction
    : (availableDirections[0] ?? '')

  // Group filtered departures by hour
  const hourMap = useMemo(() => {
    if (!schedule || !effectiveDirection) return new Map<number, number[]>()
    const filtered = schedule.filter(
      (d) => d.day_type === dayType && d.direction === effectiveDirection,
    )
    const map = new Map<number, number[]>()
    for (const dep of filtered) {
      const [h, m] = dep.departure_time.split(':').map(Number)
      if (!map.has(h)) map.set(h, [])
      map.get(h)!.push(m)
    }
    for (const mins of map.values()) mins.sort((a, b) => a - b)
    return map
  }, [schedule, dayType, effectiveDirection])

  const hours = Array.from(hourMap.keys()).sort((a, b) => a - b)

  // Check which day types have data
  const availableDays = useMemo(() => {
    if (!schedule) return new Set<string>()
    return new Set(schedule.map((d) => d.day_type))
  }, [schedule])

  return (
    <div className="flex flex-col gap-4">
      {/* Day type selector */}
      <div className="flex gap-1 bg-surface-card rounded-xl p-1 border border-surface-muted">
        {DAY_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setDayType(key); setDirection('') }}
            disabled={!availableDays.has(key)}
            className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors disabled:opacity-30 ${
              dayType === key
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Direction dropdown */}
      {availableDirections.length > 0 && (
        <select
          value={effectiveDirection}
          onChange={(e) => setDirection(e.target.value)}
          className="w-full bg-surface-card border border-surface-muted rounded-xl px-4 py-2.5
                     text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {availableDirections.map((dir) => (
            <option key={dir} value={dir}>
              {dirLabel(dir)}
            </option>
          ))}
        </select>
      )}

      {/* Hour grid */}
      {!schedule && !scheduleError && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!schedule && scheduleError && (
        <ErrorRetry message="Sefer saatleri yüklenemedi" onRetry={onRetry} />
      )}

      {schedule && hours.length === 0 && (
        <div className="text-center text-slate-500 py-12 text-sm">
          Bu gün tipi için sefer bilgisi yok
        </div>
      )}

      {hours.map((h) => (
        <div key={h} className="flex items-start gap-3">
          <div className="w-10 shrink-0 text-right">
            <span className="text-sm font-mono font-bold text-brand-400">
              {String(h).padStart(2, '0')}
            </span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 pb-2 border-b border-surface-muted/50">
            {hourMap.get(h)!.map((m) => (
              <span
                key={m}
                className="text-xs font-mono text-slate-300 bg-surface-card border border-surface-muted
                           rounded-md px-1.5 py-0.5 min-w-[30px] text-center"
              >
                {String(m).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

type Tab = 'schedule' | 'map' | 'stops' | 'alerts'

export default function RoutePage() {
  const { hatKodu } = useParams<{ hatKodu: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('schedule')

  const { data: buses, stale } = useRouteBuses(hatKodu ?? '')

  const stopsFetcher = useMemo(() => () => api.routes.stops(hatKodu ?? ''), [hatKodu])
  const scheduleFetcher = useMemo(() => () => api.routes.schedule(hatKodu ?? ''), [hatKodu])
  const announceFetcher = useMemo(() => () => api.routes.announcements(hatKodu ?? ''), [hatKodu])
  const metaFetcher = useMemo(() => () => api.routes.metadata(hatKodu ?? ''), [hatKodu])

  const { data: stops, error: stopsError, refresh: refreshStops } = usePolling<RouteStop[]>(stopsFetcher, 300_000)
  const { data: schedule, error: scheduleError, refresh: refreshSchedule } = usePolling<ScheduledDeparture[]>(scheduleFetcher, 300_000)
  const { data: announcements, error: announcementsError, refresh: refreshAnnouncements } = usePolling<Announcement[]>(announceFetcher, 300_000)
  const { data: metadata } = usePolling<RouteMetadata[]>(metaFetcher, 600_000)

  const { isFavorite, toggle } = useFavorites()
  const routeName = metadata?.[0]?.full_name ?? hatKodu ?? ''
  const favItem = { kind: 'route' as const, hat_kodu: hatKodu ?? '', name: routeName }
  const favorited = isFavorite(favItem)

  if (!hatKodu) return null

  const center: [number, number] = buses?.[0]
    ? [buses[0].latitude, buses[0].longitude]
    : [41.015, 28.98]

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'schedule', label: 'Sefer Saatleri' },
    { id: 'map', label: 'Harita', badge: buses?.length },
    { id: 'stops', label: 'Duraklar', badge: stops?.length },
    { id: 'alerts', label: 'Duyurular', badge: announcements?.length ? announcements.length : undefined },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted sticky top-0 z-40">
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
              <span className="text-lg font-bold text-brand-500 shrink-0">{hatKodu}</span>
              {routeName && routeName !== hatKodu && (
                <span className="text-xs text-slate-400 truncate">{routeName}</span>
              )}
              {stale && <span className="text-xs text-amber-400 shrink-0">⚠</span>}
            </div>
            <p className="text-[11px] text-slate-500">
              {buses?.length ?? 0} aktif araç
            </p>
          </div>

          <button
            onClick={() => toggle(favItem)}
            className={`p-1.5 rounded-xl transition-colors ${
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

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4 pb-0 flex gap-0 overflow-x-auto no-scrollbar">
          {tabs.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 shrink-0 text-sm py-2.5 px-2 font-medium border-b-2 transition-colors
                          flex items-center justify-center gap-1 ${
                tab === id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="text-[10px] bg-brand-900 text-brand-300 px-1 rounded-full">{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-28 pt-4">

        {/* Timetable tab */}
        {tab === 'schedule' && (
          <TimetableView schedule={schedule} scheduleError={scheduleError} onRetry={refreshSchedule} metadata={metadata} />
        )}

        {/* Map tab */}
        {tab === 'map' && (
          <div className="rounded-2xl overflow-hidden border border-surface-muted" style={{ height: 420 }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
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

        {/* Stops tab */}
        {tab === 'stops' && (
          <div className="flex flex-col gap-1">
            {!stops && !stopsError && (
              <div className="flex flex-col gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-surface-muted rounded-xl animate-pulse" />
                ))}
              </div>
            )}
            {!stops && stopsError && (
              <ErrorRetry message="Durak listesi yüklenemedi" onRetry={refreshStops} />
            )}
            {stops?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-sm">Bu hat için durak bulunamadı</p>
              </div>
            )}
            {stops?.map((s) => (
              <Link
                key={s.stop_code}
                to={`/stops/${s.stop_code}`}
                className="card flex items-center gap-3 py-3 hover:border-slate-500 transition-colors"
              >
                <span className="font-mono text-brand-500 text-xs w-7 text-right shrink-0 tabular-nums">
                  {s.sequence}
                </span>
                <span className="flex-1 text-sm text-slate-200 truncate">{s.stop_name}</span>
                <span className="text-xs text-slate-600 shrink-0">{s.stop_code}</span>
                <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* Alerts tab */}
        {tab === 'alerts' && (
          <div className="flex flex-col gap-3">
            {!announcements && !announcementsError && <p className="text-slate-400 text-sm">Yükleniyor...</p>}
            {!announcements && announcementsError && (
              <ErrorRetry message="Duyurular yüklenemedi" onRetry={refreshAnnouncements} />
            )}
            {announcements?.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-500">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm">Aktif duyuru yok</p>
              </div>
            )}
            {announcements?.map((a, i) => (
              <div key={i} className="card border-l-4 border-amber-500">
                <p className="text-xs text-amber-400 mb-1">{a.type} · {a.updated_at}</p>
                <p className="text-sm text-slate-200">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
