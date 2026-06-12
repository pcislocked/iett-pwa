import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import * as L from 'leaflet'
import { useRouteBuses } from '@/hooks/useFleet'
import { useQuery } from '@tanstack/react-query'
import { api, type RouteStop, type ScheduledDeparture, type Announcement, type RouteMetadata } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { getDirectionLabel } from '@/utils/routeDirectionLabels'
import { VariantSelect } from '@/components/VariantSelect'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center py-16 gap-4 text-slate-500">
      <p className="text-sm text-red-400">{message}</p>
      <button type="button" onClick={onRetry}
              className="px-4 py-2 bg-surface-muted rounded-xl text-sm text-slate-300 hover:bg-slate-600 transition-colors">
        {t('common.retry')}
      </button>
    </div>
  )
}
const formatStopName = (name: string) => name.split(' - ')[0]

function TimetableView({ schedule, scheduleError, onRetry, metadata, stops, hatKodu, onSelectVariant }: {
  schedule: ScheduledDeparture[] | null
  scheduleError: string | null
  onRetry: () => void
  metadata: RouteMetadata[] | null
  stops?: RouteStop[] | null
  hatKodu?: string
  onSelectVariant?: (variantCode: string, directionCode: string) => void
}) {
  const { t } = useTranslation()
  const [dayType, setDayType] = useState('H')
  const [direction, setDirection] = useState('')

  // Map direction code ('D'/'G') -> departure label (KALKIŞ / YÖNÜ)
  const dirLabel = useMemo(() => {
    const hasMetadata = !!metadata?.length
    return (code: string) => {
      if (stops && stops.length > 0) {
        const dirStops = stops.filter(s => s.direction === code)
        if (dirStops.length > 0) {
          const variantsInDir = Array.from(new Set(dirStops.map(s => s.route_code)))
          const firstStops = new Set<string>()
          const lastStops = new Set<string>()
          
          for (const v of variantsInDir) {
            const vStops = dirStops.filter(s => s.route_code === v)
            if (vStops.length > 0) {
              firstStops.add(formatStopName(vStops[0].stop_name))
              lastStops.add(formatStopName(vStops[vStops.length - 1].stop_name))
            }
          }
          
          if (firstStops.size === 1) {
            return `${Array.from(firstStops)[0]} KALKIŞ`
          } else if (lastStops.size === 1) {
            return `${Array.from(lastStops)[0]} YÖNÜ`
          } else if (firstStops.size > 1) {
            // Both first and last stops differ — use canonical variant (D0/G0)
            const canonicalCode = variantsInDir.find(v => v.endsWith('_D0') || v.endsWith('_G0'))
            if (canonicalCode) {
              const canonStops = dirStops.filter(s => s.route_code === canonicalCode)
              if (canonStops.length > 0) {
                return `${formatStopName(canonStops[0].stop_name)} KALKIŞ`
              }
            }
            // Fallback: metadata direction_name first part
            const meta = metadata?.find(m => (m.direction === 0 ? 'G' : 'D') === code)
            if (meta?.direction_name) {
              const firstPart = meta.direction_name.split(' - ')[0].trim()
              if (firstPart) return `${firstPart} KALKIŞ`
            }
            return code === 'G' ? t('routes.directionG', 'Gidiş') : t('routes.directionD', 'Dönüş')
          }
        }
      }

      const baseLabel = getDirectionLabel(code, metadata, hasMetadata)
      return baseLabel !== code && baseLabel !== 'Gidiş' && baseLabel !== 'Dönüş'
        ? `${baseLabel} KALKIŞ`
        : baseLabel === 'Gidiş' ? t('routes.directionG', 'Gidiş') : baseLabel === 'Dönüş' ? t('routes.directionD', 'Dönüş') : code
    }
  }, [metadata, stops, t])

  const availableDirections = useMemo(() => {
    if (!schedule) return [] as string[]
    const seen = new Set<string>()
    for (const d of schedule) {
      if (d.day_type === dayType) seen.add(d.direction)
    }
    return Array.from(seen).sort()
  }, [schedule, dayType])

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
    
    // Check if we have official note IDs from the scraper
    const hasOfficialNotes = filtered.some(d => d.official_note_id)

    // If official notes exist, build variant→number mapping from them
    // e.g. variant "15KÇ_G_D2063" always has official_note_id "-1", so its number is 1
    const officialVariantNum = new Map<string, number>()
    if (hasOfficialNotes) {
      for (const d of filtered) {
        if (d.official_note_id && d.route_variant && !officialVariantNum.has(d.route_variant)) {
          const num = Math.abs(Number(d.official_note_id))
          if (!isNaN(num) && num > 0) {
            officialVariantNum.set(d.route_variant, num)
          }
        }
      }
    }

    uniqueVariants.forEach((v, idx) => {
      const num = officialVariantNum.get(v) ?? (idx + 1)
      fnMap.set(v, num)
      
      let label = v

      let stopsLabel = ''
      const variantStops = stops?.filter(s => s.route_code === v || (!metadata?.length && `${hatKodu}_${s.direction}` === v))
      if (variantStops && variantStops.length > 1) {
        const first = formatStopName(variantStops[0].stop_name)
        const last = formatStopName(variantStops[variantStops.length - 1].stop_name)
        stopsLabel = `${first} > ${last}`
      }

      if (stopsLabel) {
        label = stopsLabel
      } else {
        const meta = metadata?.find(m => m.variant_code === v)
        if (meta && meta.direction_name) {
          const parts = meta.direction_name.split(' - ')
          label = parts.length >= 2 ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : (meta.full_name || v)
        } else if (meta && meta.full_name) {
          label = meta.full_name
        }
      }

      // If label is still the raw variant code, try harder with metadata
      if (label === v) {
        const meta = metadata?.find(m => m.variant_code === v)
        if (meta) {
          label = meta.full_name || meta.direction_name || v
        }
      }
      
      const isCanonical = v.endsWith('_D0') || v.endsWith('_G0')
      if (!isCanonical && label !== v) {
        const suffix = v.split('_').pop()
        if (suffix && suffix !== 'G' && suffix !== 'D') {
          label += ` (${suffix})`
        }
      }
      
      fnNameMap.set(num, label)
      fnVariantMap.set(num, v)
    })
    return { footnotes: fnMap, footnoteToName: fnNameMap, footnoteToVariant: fnVariantMap }
  }, [schedule, dayType, effectiveDirection, metadata, stops, hatKodu])

  const hourMap = useMemo(() => {
    if (!schedule || !effectiveDirection) return new Map<number, { m: number, fn?: number }[]>()
    const filtered = schedule.filter(d => d.day_type === dayType && d.direction === effectiveDirection)
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

  const availableDays = useMemo(() => {
    if (!schedule) return new Set<string>()
    return new Set(schedule.map((d) => d.day_type))
  }, [schedule])

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="-mx-4 px-4">
        <div role="tablist" aria-label={t('routes.daySelect', 'Gün seçimi')} className="flex border-b border-[#222]">
          {DAY_TYPES.map(({ key, label }) => (
            <button role="tab" aria-selected={dayType === key} key={key} onClick={() => { setDayType(key); setDirection('') }}
              disabled={!availableDays.has(key)}
              className={`flex-1 text-sm py-2.5 font-medium transition-colors disabled:opacity-25 border-b-2 -mb-px ${
                dayType === key ? 'border-white text-white' : 'border-transparent text-[#404040] hover:text-[#888]'
              }`}
            >
              {t(`routes.dayType.${key}`, label)}
            </button>
          ))}
        </div>

        {availableDirections.length > 1 && (
          <div role="tablist" aria-label={t('routes.directionSelect', 'Yön seçimi')} className="flex gap-0">
            {availableDirections.map((dir) => (
              <button role="tab" aria-selected={direction === dir} key={dir} onClick={() => setDirection(dir)}
                className={`flex-1 text-xs py-2 px-2 font-medium transition-colors truncate border-b-2 -mb-px ${
                  effectiveDirection === dir ? 'border-[#00AFF0] text-[#00AFF0]' : 'border-transparent text-[#404040] hover:text-[#888]'
                }`}
              >
                {dirLabel(dir)}
              </button>
            ))}
          </div>
        )}
      </div>

      {!schedule && !scheduleError && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      {!schedule && scheduleError && <ErrorRetry message="Sefer saatleri yüklenemedi" onRetry={onRetry} />}

      {schedule && hours.length === 0 && (
        <div className="text-center text-slate-500 py-12 text-sm">{t('routes.noSchedule')}</div>
      )}

      {hours.map((h) => (
        <div key={h} className="flex items-start gap-3">
          <div className="w-10 shrink-0 text-right">
            <span className="text-sm font-mono font-bold text-brand-400">{String(h).padStart(2, '0')}</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 pb-2 border-b border-surface-muted/50">
            {hourMap.get(h)!.map(({ m, fn }, idx) => {
              const variantCode = fn ? footnoteToVariant.get(fn) : undefined
              return (
                <span key={`${m}-${idx}`} className="text-xs font-mono text-slate-300 bg-surface-card border border-surface-muted rounded-md px-1.5 py-0.5 min-w-[30px] text-center">
                  {String(m).padStart(2, '0')}
                  {fn && (
                    <button onClick={() => variantCode && onSelectVariant?.(variantCode, effectiveDirection)} className="ml-0.5 text-[#00AFF0] font-bold hover:underline">
                      {fn}
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      ))}

      {footnoteToName.size > 0 && (
        <div className="mt-4 p-3 bg-surface-card border border-surface-muted rounded-xl">
          <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{t('routes.footnotes', 'Notlar (Yan Seferler)')}</h4>
          <ul className="flex flex-col gap-1.5">
            {Array.from(footnoteToName.entries()).map(([num, name]) => {
              const variantCode = footnoteToVariant.get(num)
              return (
                <li key={num}>
                  <button onClick={() => variantCode && onSelectVariant?.(variantCode, effectiveDirection)} className="text-xs text-slate-300 flex items-start gap-2 text-left hover:text-brand-300 transition-colors w-full group">
                    <span className="text-[#00AFF0] font-bold shrink-0 group-hover:underline">{num}:</span>
                    <span className="group-hover:underline">{name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="mt-4 text-center">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          {t('routes.iettNote')}{' '}
          <a 
            href={`https://iett.istanbul/RouteDetail?hkod=${hatKodu}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400 underline"
          >{t('routes.iettNoteLink')} ↗</a>
          {' '}{t('routes.iettNoteSuffix')}
        </p>
      </div>
    </div>
  )
}

type Tab = 'schedule' | 'map' | 'stops' | 'alerts'

export default function RoutePage() {
  const { t } = useTranslation()
  const { hatKodu } = useParams<{ hatKodu: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('schedule')
  const [activeDir, setActiveDir] = useState('')
  const [activeVariant, setActiveVariant] = useState('')

  const handleSelectVariant = useCallback((variantCode: string, directionCode: string) => {
    setActiveDir(directionCode)
    setActiveVariant(variantCode)
    setTab('stops')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const { data: buses, stale } = useRouteBuses(hatKodu ?? '')

  const stopsFetcher = useMemo(() => ({ signal }: { signal: AbortSignal }) => api.routes.stops(hatKodu ?? '', { signal }), [hatKodu])
  const scheduleFetcher = useMemo(() => ({ signal }: { signal: AbortSignal }) => api.routes.schedule(hatKodu ?? '', { signal }), [hatKodu])
  const announceFetcher = useMemo(() => ({ signal }: { signal: AbortSignal }) => api.routes.announcements(hatKodu ?? '', { signal }), [hatKodu])
  const metaFetcher = useMemo(() => ({ signal }: { signal: AbortSignal }) => api.routes.metadata(hatKodu ?? '', { signal }), [hatKodu])

  const { data: stops, error: stopsError, refetch: refreshStops } = useQuery<RouteStop[]>({ queryKey: ['stops', hatKodu], queryFn: stopsFetcher, refetchInterval: 300_000, enabled: !!hatKodu })
  const { data: schedule, error: scheduleError, refetch: refreshSchedule } = useQuery<ScheduledDeparture[]>({ queryKey: ['schedule', hatKodu], queryFn: scheduleFetcher, refetchInterval: 300_000, enabled: !!hatKodu })
  const { data: announcements, error: announcementsError, refetch: refreshAnnouncements } = useQuery<Announcement[]>({ queryKey: ['announcements', hatKodu], queryFn: announceFetcher, refetchInterval: 300_000, enabled: !!hatKodu })
  const { data: metadata } = useQuery<RouteMetadata[]>({ queryKey: ['metadata', hatKodu], queryFn: metaFetcher, refetchInterval: 600_000, enabled: !!hatKodu })

  // Unique direction keys from stops — "G" / "D"
  const stopsDirections = useMemo(
    () => [...new Set((stops ?? []).map((s) => s.direction))].sort(),
    [stops],
  )
  const dirLabel = (d: string) => d === 'G' ? 'Gidiş' : d === 'D' ? 'Dönüş' : d

  const effectiveDir = stopsDirections.includes(activeDir)
    ? activeDir
    : (stopsDirections[0] ?? '')

  // Get available variants for the effectiveDir
  const availableVariants = useMemo(() => {
    if (!metadata) return []
    const dirNum = effectiveDir === 'G' ? 0 : 1
    return metadata.filter((m) => m.direction === dirNum).map((m) => m.variant_code)
  }, [metadata, effectiveDir])

  const effectiveVariant = availableVariants.includes(activeVariant)
    ? activeVariant
    : (availableVariants[0] ?? '')

  // Deduplicate by stop_code within the selected direction AND variant
  const stopsForDir = useMemo(() => {
    const dirStops = (stops ?? []).filter((s) => {
      if (effectiveDir && s.direction !== effectiveDir) return false
      if (effectiveVariant && s.route_code !== effectiveVariant) return false
      return true
    })
    const seen = new Set<string>()
    return dirStops.filter((s) => { if (seen.has(s.stop_code)) return false; seen.add(s.stop_code); return true })
  }, [stops, effectiveDir, effectiveVariant])

  const busAtSequence = useMemo(() => {
    const seqs = new Set<number>()
    for (const b of (buses ?? [])) {
      if (b.stop_sequence != null && (!effectiveDir || b.direction_letter === effectiveDir))
        seqs.add(b.stop_sequence)
    }
    return seqs
  }, [buses, effectiveDir])

  const stopsForMap = stopsForDir

  const { isFavorite, toggle } = useFavorites()
  const routeName = metadata?.[0]?.full_name ?? hatKodu ?? ''
  const favItem = useMemo(() => ({ kind: 'route' as const, hat_kodu: hatKodu ?? '', name: routeName }), [hatKodu, routeName])
  const favorited = isFavorite(favItem)

  if (!hatKodu) return null

  const center: [number, number] = buses?.[0]
    ? [buses[0].latitude, buses[0].longitude]
    : [41.015, 28.98]

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'schedule', label: t('routes.timetable') },
    { id: 'map', label: t('nav.map') },
    { id: 'stops', label: t('routes.stops') },
    { id: 'alerts', label: t('stops.announcements', 'Duyurular'), badge: announcements?.length ? announcements.length : undefined },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface-card border-b border-surface-muted">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-brand-500 shrink-0">{hatKodu}</span>
              {routeName && routeName !== hatKodu && (
                <span className="text-xs text-slate-400 truncate">{routeName}</span>
              )}
              {stale && <span className="text-xs text-amber-400 shrink-0">⚠️</span>}
            </div>
            <p className="text-[11px] text-slate-500">
              {t('routes.activeBuses', { defaultValue: '{{count}} aktif araç', count: buses?.length ?? 0 })}
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
        <div role="tablist" aria-label={t('routes.tabs', 'Sekmeler')} className="max-w-2xl mx-auto px-4 pb-0 flex gap-0 overflow-x-auto no-scrollbar">
          {tabs.map(({ id, label, badge }) => (
            <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}
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
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-6 pt-2">

        {/* Timetable tab */}
        {tab === 'schedule' && (
          <TimetableView schedule={schedule ?? null} scheduleError={scheduleError ? String(scheduleError) : null} onRetry={refreshSchedule} metadata={metadata ?? null} stops={stops ?? null} hatKodu={hatKodu} onSelectVariant={handleSelectVariant} />
        )}

        {/* Map tab */}
        {tab === 'map' && (
          <div className="flex flex-col gap-2">
            {/* Direction pills — map tab, Metro flat */}
            {stopsDirections.length > 1 && (
              <div role="tablist" aria-label="Gün seçimi" className="flex border-b border-[#222]">
                {stopsDirections.map((dir) => (
                  <button role="tab" aria-selected={effectiveDir === dir} key={dir} onClick={() => setActiveDir(dir)}
                    className={`flex-1 text-xs py-2 px-2 font-medium transition-colors truncate border-b-2 -mb-px ${
                      effectiveDir === dir
                        ? 'border-[#00AFF0] text-[#00AFF0]'
                        : 'border-transparent text-[#404040] hover:text-[#888]'
                    }`}
                  >
                    {dirLabel(dir)}
                  </button>
                ))}
              </div>
            )}
            {/* Variant Select */}
            {effectiveDir && (
              <div className="px-1 mt-2">
                <VariantSelect
                  metadata={metadata ?? null}
                  direction={effectiveDir}
                  selectedVariant={effectiveVariant}
                  onChange={setActiveVariant}
                />
              </div>
            )}
            {/* Bus direction legend */}
            {buses && buses.length > 0 && (
              <div className="flex items-center gap-4 px-1">
                {[...new Map(buses.filter((b) => b.direction_letter).map((b) => [b.direction_letter, b])).values()].map((b) => (
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
                {stopsForMap.map((s) => (
                  <CircleMarker
                    key={`${s.direction}-${s.stop_code}`}
                    center={[s.latitude, s.longitude]}
                    radius={5}
                    pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 1, weight: 2 }}
                    eventHandlers={{ click: () => { navigate(`/stops/${s.stop_code}`) } }}
                  />
                ))}
                {buses
                  ?.filter((b) => {
                    if (effectiveDir && b.direction_letter !== effectiveDir) return false
                    if (effectiveVariant && b.route_code && b.route_code.includes('_') && b.route_code !== effectiveVariant) return false
                    return true
                  })
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
            {/* Direction filter pills — stops tab, Metro flat */}
            {stopsDirections.length > 1 && (
              <div className="flex border-b border-[#222] mb-1">
                {stopsDirections.map((dir) => (
                  <button role="tab" aria-selected={effectiveDir === dir} key={dir} onClick={() => setActiveDir(dir)}
                    className={`flex-1 text-xs py-2 px-2 font-medium transition-colors truncate border-b-2 -mb-px ${
                      effectiveDir === dir
                        ? 'border-[#00AFF0] text-[#00AFF0]'
                        : 'border-transparent text-[#404040] hover:text-[#888]'
                    }`}
                  >
                    {dirLabel(dir)}
                  </button>
                ))}
              </div>
            )}
            {/* Variant Select */}
            {effectiveDir && (
              <div className="px-1 mt-1">
                <VariantSelect
                  metadata={metadata ?? null}
                  direction={effectiveDir}
                  selectedVariant={effectiveVariant}
                  onChange={setActiveVariant}
                />
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
              <ErrorRetry message={t('common.error', 'Durak listesi yüklenemedi')} onRetry={refreshStops} />
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
                <p className="text-sm">{t('common.noData')}</p>
              </div>
            )}
            {stopsForDir.map((s) => (
              <Link
                key={`${s.direction}-${s.stop_code}`}
                to={`/stops/${s.stop_code}`}
                className="card flex items-center gap-3 py-3 hover:border-slate-500 transition-colors"
              >
                <span className="font-mono text-brand-500 text-xs w-7 text-right shrink-0 tabular-nums">
                  {s.sequence}
                </span>
                <span className="flex-1 text-sm text-slate-200 truncate">{s.stop_name}</span>
                {busAtSequence.has(s.sequence) && (
                  <span title={t('routes.busHere', 'Otobüs burada')} className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                        style={{ background: effectiveDir === 'D' ? '#f59e0b' : '#2563eb' }} />
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
            {!announcements && !announcementsError && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}
            {!announcements && announcementsError && (
              <ErrorRetry message={t('common.error', 'Duyurular yüklenemedi')} onRetry={refreshAnnouncements} />
            )}
            {announcements?.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-500">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm">{t('stops.noAnnouncements', 'Aktif duyuru yok')}</p>
              </div>
            )}
            {announcements?.map((a, i) => (
              <div key={i} className="card border-l-4 border-amber-500">
                <p className="text-xs text-amber-400 mb-1">{a.type} Â· {a.updated_at}</p>
                <p className="text-sm text-slate-200">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}





