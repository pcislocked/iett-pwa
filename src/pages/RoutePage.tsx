import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import * as L from 'leaflet'
import { useRouteBuses } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type RouteStop, type ScheduledDeparture, type Announcement, type RouteMetadata } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { getDirectionLabel, getDestinationLabel } from '@/utils/routeDirectionLabels'

const busIconG = L.divIcon({
  className: '',
  html: `<div style="background:#2563eb;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})
const busIconD = L.divIcon({
  className: '',
  html: `<div style="background:#f59e0b;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})
const busIconUnknown = L.divIcon({
  className: '',
  html: `<div style="background:#6b7280;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
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

function TimetableView({ schedule, scheduleError, onRetry, metadata, onSelectVariant }: {
  schedule: ScheduledDeparture[] | null
  scheduleError: string | null
  onRetry: () => void
  metadata: RouteMetadata[] | null
  onSelectVariant?: (variant: string) => void
}) {
  const [dayType, setDayType] = useState('H')
  const [direction, setDirection] = useState('')

  // Map direction code ('D'/'G') → departure label (KALKIŞ)
  const dirLabel = useMemo(() => {
    const hasMetadata = !!metadata?.length
    return (code: string) => {
      const baseLabel = getDirectionLabel(code, metadata, hasMetadata)
      return baseLabel !== code && baseLabel !== 'Gidiş' && baseLabel !== 'Dönüş'
        ? `${baseLabel} KALKIŞ`
        : baseLabel === 'Gidiş' ? 'Gidiş' : baseLabel === 'Dönüş' ? 'Dönüş' : code
    }
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

  // Generate dynamic footnotes for sub-routes
  const { footnotes, footnoteToName, footnoteToVariant } = useMemo(() => {
    const fnMap = new Map<string, number>()
    const fnNameMap = new Map<number, string>()
    const fnVariantMap = new Map<number, string>()
    if (!schedule || !effectiveDirection) return { footnotes: fnMap, footnoteToName: fnNameMap, footnoteToVariant: fnVariantMap }

    const filtered = schedule.filter(d => d.day_type === dayType && d.direction === effectiveDirection)
    const uniqueVariants = [...new Set(filtered.map(d => d.route_variant).filter(v => v && !v.endsWith('_D0') && !v.endsWith('_G0')))].sort()
    
    const metaMap = new Map<string, string>()
    if (metadata) {
      for (const m of metadata) {
        if (m.variant_code && m.full_name) metaMap.set(m.variant_code, m.full_name)
      }
    }

    uniqueVariants.forEach((v, idx) => {
      const num = idx + 1
      fnMap.set(v, num)
      fnNameMap.set(num, metaMap.get(v) ?? v)
      fnVariantMap.set(num, v)
    })
    return { footnotes: fnMap, footnoteToName: fnNameMap, footnoteToVariant: fnVariantMap }
  }, [schedule, dayType, effectiveDirection, metadata])

  // Group filtered departures by hour
  const hourMap = useMemo(() => {
    if (!schedule || !effectiveDirection) return new Map<number, { m: number, fn?: number }[]>()
    const filtered = schedule.filter(
      (d) => d.day_type === dayType && d.direction === effectiveDirection,
    )
    const map = new Map<number, { m: number, fn?: number }[]>()
    for (const dep of filtered) {
      const [h, m] = dep.departure_time.split(':').map(Number)
      if (!map.has(h)) map.set(h, [])
      map.get(h)!.push({ m, fn: footnotes.get(dep.route_variant) })
    }
    for (const mins of map.values()) mins.sort((a, b) => a.m - b.m)
    return map
  }, [schedule, dayType, effectiveDirection, footnotes])

  const hours = Array.from(hourMap.keys()).sort((a, b) => a - b)

  // Check which day types have data
  const availableDays = useMemo(() => {
    if (!schedule) return new Set<string>()
    return new Set(schedule.map((d) => d.day_type))
  }, [schedule])

  /* ── Metro-style day type selector ── */
  return (
    <div className="flex flex-col gap-4">
      {/* Day type selector */}
      <div className="flex border-b border-[#222]">
        {DAY_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setDayType(key); setDirection('') }}
            disabled={!availableDays.has(key)}
            className={`flex-1 text-sm py-2.5 font-medium transition-colors disabled:opacity-25 border-b-2 -mb-px ${
              dayType === key
                ? 'border-white text-white'
                : 'border-transparent text-[#404040] hover:text-[#888]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Direction pill toggle — flat Metro style */}
      {availableDirections.length > 1 && (
        <div className="flex gap-0 border-b border-[#222]">
          {availableDirections.map((dir) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`flex-1 text-xs py-2 px-2 font-medium transition-colors truncate border-b-2 -mb-px ${
                effectiveDirection === dir
                  ? 'border-[#00AFF0] text-[#00AFF0]'
                  : 'border-transparent text-[#404040] hover:text-[#888]'
              }`}
            >
              {dirLabel(dir)}
            </button>
          ))}
        </div>
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
            {hourMap.get(h)!.map(({ m, fn }, idx) => {
              const variantCode = fn ? footnoteToVariant.get(fn) : undefined
              return (
                <span
                  key={`${m}-${idx}`}
                  className="text-xs font-mono text-slate-300 bg-surface-card border border-surface-muted
                             rounded-md px-1.5 py-0.5 min-w-[30px] text-center"
                >
                  {String(m).padStart(2, '0')}
                  {fn && (
                    <button 
                      onClick={() => variantCode && onSelectVariant?.(variantCode)}
                      className="ml-0.5 text-[#00AFF0] font-bold hover:underline"
                    >
                      {fn}
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      ))}

      {/* Legend (Notlar) */}
      {footnoteToName.size > 0 && (
        <div className="mt-4 p-3 bg-surface-card border border-surface-muted rounded-xl">
          <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Notlar (Yan Seferler)</h4>
          <ul className="flex flex-col gap-1.5">
            {Array.from(footnoteToName.entries()).map(([num, name]) => (
              <li key={num} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-[#00AFF0] font-bold shrink-0">{num}:</span>
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type Tab = 'schedule' | 'map' | 'stops' | 'alerts'

export default function RoutePage() {
  const { hatKodu } = useParams<{ hatKodu: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('schedule')
  const [selectedVariant, setSelectedVariant] = useState('')

  const { data: buses, stale } = useRouteBuses(hatKodu ?? '')

  const stopsFetcher = useMemo(() => () => api.routes.stops(hatKodu ?? ''), [hatKodu])
  const scheduleFetcher = useMemo(() => () => api.routes.schedule(hatKodu ?? ''), [hatKodu])
  const announceFetcher = useMemo(() => () => api.routes.announcements(hatKodu ?? ''), [hatKodu])
  const metaFetcher = useMemo(() => () => api.routes.metadata(hatKodu ?? ''), [hatKodu])

  const { data: stops, error: stopsError, refresh: refreshStops } = usePolling<RouteStop[]>(stopsFetcher, 300_000)
  const { data: schedule, error: scheduleError, refresh: refreshSchedule } = usePolling<ScheduledDeparture[]>(scheduleFetcher, 300_000)
  const { data: announcements, error: announcementsError, refresh: refreshAnnouncements } = usePolling<Announcement[]>(announceFetcher, 300_000)
  const { data: metadata } = usePolling<RouteMetadata[]>(metaFetcher, 600_000)

  // Unique route variants derived from available stops (or canonical metadata if loading)
  const variantOptions = useMemo(() => {
    // 1. Determine which variant codes to show
    let availableCodes: string[] = []
    let isSoapFallback = false

    if (stops && stops.length > 0) {
      const hasVariantCodes = stops.some(s => s.route_code && s.route_code !== hatKodu)
      if (hasVariantCodes) {
        availableCodes = [...new Set(stops.map(s => s.route_code))].sort()
      } else {
        isSoapFallback = true
        availableCodes = [...new Set(stops.map(s => `${hatKodu}_${s.direction}`))].sort()
      }
    } else if (metadata) {
      // If stops are still loading, show only the canonical variants to avoid duplicate spam
      availableCodes = metadata.filter(m => m.variant_code?.endsWith('_D0') || m.variant_code?.endsWith('_G0')).map(m => m.variant_code)
    }

    if (availableCodes.length === 0) return []

    // 2. Build options with labels from metadata
    const options = availableCodes.map(code => {
      let label = code
      let isG = code.includes('_G_') || code.includes('_119_') || code.endsWith('_G')

      if (isSoapFallback) {
        isG = code.endsWith('_G')
        label = isG ? 'Gidiş' : 'Dönüş'
        return { value: code, label, direction_letter: (isG ? 'G' : 'D') as 'G' | 'D' }
      }

      const meta = metadata?.find(m => m.variant_code === code)
      if (meta) {
        isG = (meta.direction === 0 || meta.direction === 119)
        const parts = meta.direction_name ? meta.direction_name.split(' - ') : []
        label = parts.length >= 2 ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : (meta.full_name || code)
      } else {
        // Missing metadata (e.g. 14M_D_D0 when ntcapi only returned G variants)
        // Try to derive label by reversing the opposite direction's name
        const oppositeMeta = metadata?.find(m => m.variant_code && m.variant_code.includes(isG ? '_D_' : '_G_')) || metadata?.[0]
        if (oppositeMeta && oppositeMeta.direction_name) {
          const parts = oppositeMeta.direction_name.split(' - ')
          if (parts.length >= 2) {
            label = isG ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : `${parts[parts.length - 1].trim()} > ${parts[0].trim()}`
          }
        }
      }

      return { value: code, label, direction_letter: (isG ? 'G' : 'D') as 'G' | 'D' }
    })

    // 3. Deduplicate labels (e.g. if two variants actually have the same label)
    const labelCounts = options.reduce((acc, opt) => {
      acc[opt.label] = (acc[opt.label] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return options.map(opt => {
      if (labelCounts[opt.label] > 1) {
        const meta = metadata?.find(m => m.variant_code === opt.value)
        return { ...opt, label: meta?.full_name || opt.value }
      }
      return opt
    })
  }, [metadata, stops, hatKodu])

  useEffect(() => {
    if (variantOptions.length > 0) {
      const exists = variantOptions.some(o => o.value === selectedVariant)
      if (!exists) {
        const canonical = variantOptions.find(o => o.value.endsWith('_D0') || o.value.endsWith('_G0'))
        setSelectedVariant(canonical?.value || variantOptions[0].value)
      }
    }
  }, [variantOptions, selectedVariant])

  const activeOption = variantOptions.find(o => o.value === selectedVariant)
  const activeDirectionLetter = activeOption?.direction_letter ?? ''

  const stopsForVariant = useMemo(() => {
    if (!selectedVariant) return []
    if (selectedVariant === `${hatKodu}_G` || selectedVariant === `${hatKodu}_D`) {
      const dir = selectedVariant.slice(hatKodu!.length + 1)
      return (stops ?? []).filter(s => s.direction === dir)
    }
    return (stops ?? []).filter(s => s.route_code === selectedVariant)
  }, [stops, selectedVariant, hatKodu])

  // Build map of stop_sequence to bus directions
  const busAtSequence = useMemo(() => {
    const seqs = new Map<number, Set<string>>()
    for (const b of (buses ?? [])) {
      if (b.stop_sequence != null && (!activeDirectionLetter || b.direction_letter === activeDirectionLetter)) {
        if (!seqs.has(b.stop_sequence)) seqs.set(b.stop_sequence, new Set())
        seqs.get(b.stop_sequence)!.add(b.direction ?? 'Otobüs')
      }
    }
    return seqs
  }, [buses, activeDirectionLetter])

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
    { id: 'stops', label: 'Duraklar', badge: stopsForVariant.length ?? stops?.length },
    { id: 'alerts', label: 'Duyurular', badge: announcements?.length ? announcements.length : undefined },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
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

        {/* Tab bar — Metro flat style */}
        <div className="max-w-2xl mx-auto px-4 pb-0 flex gap-0 overflow-x-auto no-scrollbar border-b border-[#111]">
          {tabs.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 shrink-0 text-sm py-2.5 px-2 font-medium border-b-2 -mb-px transition-colors
                          flex items-center justify-center gap-1 ${
                tab === id
                  ? 'border-white text-white'
                  : 'border-transparent text-[#404040] hover:text-[#888]'
              }`}
            >
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="text-[10px] bg-[#111] text-[#a6a6a6] px-1 rounded">{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-6 pt-4">

        {/* Timetable tab */}
        {tab === 'schedule' && (
          <TimetableView 
            schedule={schedule} 
            scheduleError={scheduleError} 
            onRetry={refreshSchedule} 
            metadata={metadata} 
            onSelectVariant={(v) => { setSelectedVariant(v); setTab('stops') }}
          />
        )}

        {/* Map tab */}
        {tab === 'map' && (
          <div className="flex flex-col gap-2">
            {/* Dropdown — map tab */}
            {variantOptions.length > 1 && (
              <div className="px-1 border-b border-[#222] pb-2">
                <select 
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  aria-label="Güzergâh varyantı"
                  className="w-full bg-surface-card border border-surface-muted text-slate-200 text-sm rounded-lg p-2.5 outline-none focus:border-[#00AFF0]"
                >
                  {variantOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Bus direction legend */}
            {buses && buses.length > 0 && (
              <div className="flex items-center gap-4 px-1">
                {[...new Map(buses.filter(b => b.direction_letter).map(b => [b.direction_letter, b])).values()].map((b) => (
                  <div key={b.direction_letter} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border border-white/40 shrink-0" style={{ background: b.direction_letter === 'G' ? '#2563eb' : '#f59e0b' }} />
                    <span className="text-[10px] text-[#888] truncate">{b.direction ?? b.direction_letter}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-2xl overflow-hidden border border-surface-muted" style={{ height: 420 }}>
              <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {/* BUG-23: navigate to stop on click instead of showing popup */}
                {stopsForVariant.map((s) => (
                  <CircleMarker
                    key={`${s.direction}-${s.stop_code}-${s.sequence}`}
                    center={[s.latitude, s.longitude]}
                    radius={5}
                    pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 1, weight: 2 }}
                    eventHandlers={{ click: () => { navigate(`/stops/${s.stop_code}`) } }}
                  />
                ))}
                {buses
                  ?.filter((b) => !activeDirectionLetter || b.direction_letter === activeDirectionLetter)
                  .map((b) => (
                    <Marker
                      key={b.kapino}
                      position={[b.latitude, b.longitude]}
                      icon={b.direction_letter === 'G' ? busIconG : b.direction_letter === 'D' ? busIconD : busIconUnknown}
                    >
                      <Popup>
                        <strong>{b.kapino}</strong><br />
                        {b.direction}
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Stops tab */}
        {tab === 'stops' && (
          <div className="flex flex-col gap-1">
            {/* Dropdown — stops tab */}
            {variantOptions.length > 1 && (
              <div className="px-1 border-b border-[#222] pb-2 mb-1">
                <select 
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  aria-label="Güzergâh varyantı"
                  className="w-full bg-surface-card border border-surface-muted text-slate-200 text-sm rounded-lg p-2.5 outline-none focus:border-[#00AFF0]"
                >
                  {variantOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
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
            {stopsForVariant.map((s) => (
              <Link
                key={`${s.direction}-${s.stop_code}-${s.sequence}`}
                to={`/stops/${s.stop_code}`}
                className="card flex items-center gap-3 py-3 hover:border-slate-500 transition-colors"
              >
                <span className="font-mono text-brand-500 text-xs w-7 text-right shrink-0 tabular-nums">
                  {s.sequence}
                </span>
                <span className="flex-1 text-sm text-slate-200 truncate">{s.stop_name}</span>
                {busAtSequence.has(s.sequence) && (
                  <span title={`Otobüs burada: ${Array.from(busAtSequence.get(s.sequence)!).join(', ')}`} 
                        className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse cursor-help"
                        style={{ background: activeDirectionLetter === 'D' ? '#f59e0b' : '#2563eb' }} />
                )}
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
