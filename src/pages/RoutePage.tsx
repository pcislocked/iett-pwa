import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import * as L from 'leaflet'
import { useRouteBuses } from '@/hooks/useFleet'
import { usePolling } from '@/hooks/usePolling'
import { api, type RouteStop, type ScheduledDeparture, type Announcement, type RouteMetadata } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { getDirectionLabel } from '@/utils/routeDirectionLabels'
import { formatStopName } from '@/utils/formatStopName'
import { POLLING } from '@/config/polling'
import BusDetailSheet from '@/components/BusDetailSheet'

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

function VariantSelect({ 
  options, 
  value, 
  onChange, 
  className 
}: { 
  options: { value: string; label: string; isCanonical?: boolean; separatorAfter?: boolean }[]
  value: string
  onChange: (val: string) => void
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className={`relative ${className || ''}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-surface cursor-pointer border border-brand-500/50 hover:border-brand-500 transition-colors rounded-xl px-3 py-2.5"
      >
        <span className="text-sm font-semibold text-slate-100 truncate pr-2">{selected?.label || 'Seçiniz'}</span>
        <svg className={`w-4 h-4 text-brand-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[990]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-card border border-surface-muted rounded-xl overflow-hidden z-[1000] shadow-xl shadow-black/50">
            <div className="max-h-[300px] overflow-y-auto overscroll-contain">
              {options.map(o => (
                <div key={o.value}>
                  <button
                    onClick={() => { onChange(o.value); setIsOpen(false) }}
                    className={`w-full text-left px-3 py-3 text-sm transition-colors hover:bg-surface-muted flex items-center justify-between ${
                      value === o.value ? 'bg-brand-500/10 text-brand-400' : 'text-slate-300'
                    } ${o.isCanonical ? 'font-bold' : ''}`}
                  >
                    <span className="truncate">{o.label}</span>
                  </button>
                  {o.separatorAfter && <hr className="border-surface-muted my-1" />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

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

function TimetableView({ schedule, scheduleError, onRetry, metadata, onSelectVariant, stops, hatKodu }: {
  schedule: ScheduledDeparture[] | null
  scheduleError: string | null
  onRetry: () => void
  metadata: RouteMetadata[] | null
  onSelectVariant?: (variant: string) => void
  stops?: RouteStop[] | null
  hatKodu?: string
}) {
  const [dayType, setDayType] = useState('H')
  const [direction, setDirection] = useState('')

  // Map direction code ('D'/'G') → departure label (KALKIŞ / YÖNÜ)
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
              firstStops.add(formatStopName(vStops[0].stop_name).split(' - ')[0])
              lastStops.add(formatStopName(vStops[vStops.length - 1].stop_name).split(' - ')[0])
            }
          }
          
          if (firstStops.size === 1) {
            return `${Array.from(firstStops)[0]} KALKIŞ`
          } else if (lastStops.size === 1) {
            return `${Array.from(lastStops)[0]} YÖNÜ`
          } else if (firstStops.size > 1) {
            return `ÇEŞİTLİ KALKIŞLAR (${code === 'G' ? 'Gidiş' : 'Dönüş'})`
          }
        }
      }

      const baseLabel = getDirectionLabel(code, metadata, hasMetadata)
      return baseLabel !== code && baseLabel !== 'Gidiş' && baseLabel !== 'Dönüş'
        ? `${baseLabel} KALKIŞ`
        : baseLabel === 'Gidiş' ? 'Gidiş' : baseLabel === 'Dönüş' ? 'Dönüş' : code
    }
  }, [metadata, stops])

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
      
      let label = v

      // 1. Try to derive from physical stops
      let stopsLabel = ''
      const variantStops = stops?.filter(s => s.route_code === v || (!metadata?.length && `${hatKodu}_${s.direction}` === v))
      if (variantStops && variantStops.length > 1) {
        const first = formatStopName(variantStops[0].stop_name).split(' - ')[0]
        const last = formatStopName(variantStops[variantStops.length - 1].stop_name).split(' - ')[0]
        stopsLabel = `${first} > ${last}`
      }

      if (stopsLabel) {
        label = stopsLabel
      } else {
        const meta = metadata?.find(m => m.variant_code === v)
        if (meta) {
          const parts = meta.direction_name ? meta.direction_name.split(' - ') : []
          label = parts.length >= 2 ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : (meta.full_name || v)
        } else {
          const isG = v.includes('_G_') || v.includes('_119_') || v.endsWith('_G')
          const oppositeMeta = metadata?.find(m => m.variant_code && m.variant_code.includes(isG ? '_D_' : '_G_')) || metadata?.[0]
          if (oppositeMeta && oppositeMeta.direction_name) {
            const parts = oppositeMeta.direction_name.split(' - ')
            if (parts.length >= 2) {
              label = isG ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : `${parts[parts.length - 1].trim()} > ${parts[0].trim()}`
            }
          }
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

  const [showWarningDetail, setShowWarningDetail] = useState(false)

  // Warning for mismatched metadata or multiple origin stations
  const directionWarning = useMemo(() => {
    if (!stops || stops.length === 0 || !effectiveDirection) return null

    const dirStops = stops.filter(s => s.direction === effectiveDirection)
    if (dirStops.length === 0) return null

    const variantsInDir = Array.from(new Set(dirStops.map(s => s.route_code)))
    const firstStops = new Set<string>()
    for (const v of variantsInDir) {
      const vStops = dirStops.filter(s => s.route_code === v)
      if (vStops.length > 0) {
        firstStops.add(formatStopName(vStops[0].stop_name).split(' - ')[0])
      }
    }

    if (firstStops.size > 1) {
      return {
        type: 'multiple',
        text: 'Birden fazla kalkış istasyonu',
        detail: 'Bu yönde farklı istasyonlardan kalkan alternatif güzergahlar mevcut. Sistemimiz alternatif güzergahları analiz edip aşağıda listelese de, karmaşık resmi veri için IETT web sitesine bakmanız önerilir.'
      }
    }

    // Check mismatch for single starting point
    const actualFirstStop = Array.from(firstStops)[0]
    if (actualFirstStop) {
      const hasMetadata = !!metadata?.length
      const metaLabel = getDirectionLabel(effectiveDirection, metadata, hasMetadata)
      
      if (metaLabel && metaLabel !== effectiveDirection && metaLabel !== 'Gidiş' && metaLabel !== 'Dönüş') {
        const isMatch = actualFirstStop.includes(metaLabel) || metaLabel.includes(actualFirstStop) || 
                        actualFirstStop.split(' ').some(w => w.length > 3 && metaLabel.includes(w)) ||
                        metaLabel.split(' ').some(w => w.length > 3 && actualFirstStop.includes(w))

        if (!isMatch) {
          return {
            type: 'mismatch',
            text: 'Kalkış istasyonları eşleşmiyor',
            detail: `IETT verisinde yön "${metaLabel}" olarak geçmesine rağmen, fiziksel durak "${actualFirstStop}" durağından başlıyor. Uygulamamız doğru fiziksel durakları baz alsa da, resmi veri için IETT'ye güvenmeniz önerilir.`
          }
        }
      }
    }

    return null
  }, [stops, effectiveDirection, metadata])

  // Check which day types have data
  const availableDays = useMemo(() => {
    if (!schedule) return new Set<string>()
    return new Set(schedule.map((d) => d.day_type))
  }, [schedule])

  /* ── Metro-style day type selector ── */
  return (
    <div className="flex flex-col h-full min-h-0 px-4">
      {/* Static Sub-filters container */}
      <div className="sticky top-0 shrink-0 flex flex-col bg-[#0a0a0a] z-20 pb-2 pt-4 -mx-4 px-4 border-b border-[#222]">
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
          <div className="flex gap-0 border-t border-[#222] mt-2 pt-1">
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

        {/* Info warning for mismatches or multiple terminals */}
        {directionWarning && (
          <div className="px-1 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-brand-400 bg-brand-500/10 px-2.5 py-1.5 rounded-lg w-fit">
            <span className="truncate">{directionWarning.text}</span>
            <button 
              onClick={() => setShowWarningDetail(!showWarningDetail)}
              className="p-1 hover:bg-brand-500/20 rounded-full shrink-0 transition-colors"
              title="Detay"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          {showWarningDetail && (
            <div className="mt-2 text-[11px] text-brand-100/70 bg-brand-500/5 p-2.5 rounded-lg border border-brand-500/10 leading-relaxed">
              {directionWarning.detail}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pt-2">
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
              {Array.from(footnoteToName.entries()).map(([num, name]) => {
                const variantCode = footnoteToVariant.get(num)
                return (
                  <li key={num}>
                    <button 
                      onClick={() => variantCode && onSelectVariant?.(variantCode)}
                      className="text-xs text-slate-300 flex items-start gap-2 text-left hover:text-brand-300 transition-colors w-full group"
                    >
                      <span className="text-[#00AFF0] font-bold shrink-0 group-hover:underline">{num}:</span>
                      <span className="group-hover:underline">{name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

type Tab = 'schedule' | 'map' | 'stops' | 'alerts'

function StopPopupContent({ s }: { s: RouteStop }) {
  const navigate = useNavigate()
  const [direction, setDirection] = useState(s.stop_direction)

  useEffect(() => {
    if (!s.stop_direction) {
      api.stops.detail(s.stop_code).then(res => {
        if (res.direction) setDirection(res.direction)
      }).catch(() => {})
    }
  }, [s.stop_code, s.stop_direction])

  return (
    <div className="text-center min-w-[150px] max-w-[200px] px-1 py-1">
      <p className="font-bold text-slate-100 text-[13px] mb-2 leading-tight">
        {formatStopName(s.stop_name).split(' - ')[0]}
        <br/>
        <span className="text-[11px] text-slate-300 font-medium">
          {direction ? `(${direction} Yönü - ${s.stop_code})` : `(#${s.stop_code})`}
        </span>
      </p>
      <button
        onClick={() => navigate(`/stops/${s.stop_code}`)}
        className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded text-[11px] font-semibold w-full transition-colors"
      >
        Durağa Git
      </button>
    </div>
  )
}

export default function RoutePage() {
  const { hatKodu } = useParams<{ hatKodu: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('schedule')
  const [selectedVariant, setSelectedVariant] = useState('all')
  const [selectedBus, setSelectedBus] = useState<any>(null)

  const { data: buses, stale } = useRouteBuses(hatKodu ?? '')

  const stopsFetcher = useCallback(() => api.routes.stops(hatKodu ?? ''), [hatKodu])
  const scheduleFetcher = useCallback(() => api.routes.schedule(hatKodu ?? ''), [hatKodu])
  const announceFetcher = useCallback(() => api.routes.announcements(hatKodu ?? ''), [hatKodu])
  const metaFetcher = useCallback(() => api.routes.metadata(hatKodu ?? ''), [hatKodu])

  const { data: stops, error: stopsError, refresh: refreshStops } = usePolling<RouteStop[]>(stopsFetcher, POLLING.ROUTE_STOPS_MS, hatKodu)
  const { data: schedule, error: scheduleError, refresh: refreshSchedule } = usePolling<ScheduledDeparture[]>(scheduleFetcher, POLLING.ROUTE_SCHEDULE_MS, hatKodu)
  const { data: announcements, error: announcementsError, refresh: refreshAnnouncements } = usePolling<Announcement[]>(announceFetcher, POLLING.ANNOUNCEMENTS_MS, hatKodu)
  const { data: metadata } = usePolling<RouteMetadata[]>(metaFetcher, POLLING.ROUTE_META_MS, hatKodu)

  // Unique route variants derived from available stops (or canonical metadata if loading)
  const { mapVariantOptions, stopsVariantOptions, variantOptions } = useMemo(() => {
    // 1. Determine which variant codes to show
    let availableCodes: string[] = []
    let isSoapFallback = false

    if (stops && stops.length > 0) {
      const hasVariantCodes = stops.some(s => s.route_code && s.route_code !== hatKodu)
      if (hasVariantCodes) {
        availableCodes = [...new Set(stops.map(s => s.route_code).filter(Boolean) as string[])].sort()
      } else {
        isSoapFallback = true
        availableCodes = [...new Set(stops.map(s => `${hatKodu}_${s.direction}`))].sort()
      }
    } else if (metadata) {
      // If stops are still loading, show only the canonical variants to avoid duplicate spam
      availableCodes = metadata.filter(m => m.variant_code?.endsWith('_D0') || m.variant_code?.endsWith('_G0')).map(m => m.variant_code)
    }

    if (availableCodes.length === 0) return { mapVariantOptions: [], stopsVariantOptions: [], variantOptions: [] }

    // 2. Build options with labels from metadata and actual stops
    let options = availableCodes.map(code => {
      let label = code
      let isG = code.includes('_G_') || code.includes('_119_') || code.endsWith('_G')

      // 2a. Derive physical true label from actual stops
      let stopsLabel = ''
      const variantStops = stops?.filter(s => s.route_code === code || (isSoapFallback && `${hatKodu}_${s.direction}` === code))
      if (variantStops && variantStops.length > 1) {
        const first = formatStopName(variantStops[0].stop_name).split(' - ')[0]
        const last = formatStopName(variantStops[variantStops.length - 1].stop_name).split(' - ')[0]
        stopsLabel = `${first} > ${last}`
      }

      if (isSoapFallback) {
        isG = code.endsWith('_G')
        label = stopsLabel || (isG ? 'Gidiş' : 'Dönüş')
        return { value: code, label, direction_letter: (isG ? 'G' : 'D') as 'G' | 'D', isCanonical: true }
      }

      const meta = metadata?.find(m => m.variant_code === code)
      if (meta) {
        isG = (meta.direction === 0 || meta.direction === 119)
      }
      
      // Use physical stops label if available, otherwise fallback to metadata
      if (stopsLabel) {
        label = stopsLabel
      } else if (meta) {
        const parts = meta.direction_name ? meta.direction_name.split(' - ') : []
        label = parts.length >= 2 ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : (meta.full_name || code)
      } else {
        const oppositeMeta = metadata?.find(m => m.variant_code && m.variant_code.includes(isG ? '_D_' : '_G_')) || metadata?.[0]
        if (oppositeMeta && oppositeMeta.direction_name) {
          const parts = oppositeMeta.direction_name.split(' - ')
          if (parts.length >= 2) {
            label = isG ? `${parts[0].trim()} > ${parts[parts.length - 1].trim()}` : `${parts[parts.length - 1].trim()} > ${parts[0].trim()}`
          }
        }
      }
      
      const isCanonical = code.endsWith('_D0') || code.endsWith('_G0')
      if (!isCanonical) {
        const suffix = code.split('_').pop()
        if (suffix && suffix !== 'G' && suffix !== 'D') {
          label += ` (${suffix})`
        }
      }

      return { value: code, label, direction_letter: (isG ? 'G' : 'D') as 'G' | 'D', isCanonical }
    })

    // 3. Deduplicate labels
    const labelCounts = options.reduce((acc, opt) => {
      acc[opt.label] = (acc[opt.label] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    options = options.map(opt => {
      if (labelCounts[opt.label] > 1) {
        const meta = metadata?.find(m => m.variant_code === opt.value)
        return { ...opt, label: meta?.full_name ? `${opt.label} (${meta.full_name.split(' ').pop()})` : opt.value }
      }
      return opt
    })

    // Sort: canonicals first (G then D), then others (G then D)
    options.sort((a, b) => {
      if (a.isCanonical && !b.isCanonical) return -1
      if (!a.isCanonical && b.isCanonical) return 1
      if (a.direction_letter === 'G' && b.direction_letter === 'D') return -1
      if (a.direction_letter === 'D' && b.direction_letter === 'G') return 1
      return a.label.localeCompare(b.label)
    })

    // Add separator after the last canonical
    const lastCanonicalIdx = options.reduce((lastIdx, opt, idx) => opt.isCanonical ? idx : lastIdx, -1)
    if (lastCanonicalIdx !== -1 && lastCanonicalIdx < options.length - 1) {
      options[lastCanonicalIdx].separatorAfter = true
    }

    const mapOptions = [{ value: 'all', label: 'Tüm Seferler', isCanonical: true, separatorAfter: lastCanonicalIdx === -1 }, ...options]
    return { mapVariantOptions: mapOptions, stopsVariantOptions: options, variantOptions: options }
  }, [metadata, stops, hatKodu])

  useEffect(() => {
    if (variantOptions.length > 0) {
      if (selectedVariant === 'all') return // 'all' is a valid state (used by map)
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
    if (!stops) return []
    
    let effectiveVariant = selectedVariant
    if (effectiveVariant === 'all' && stopsVariantOptions.length > 0) {
      if (tab === 'map') return stops // Map renders all stops when 'all' is selected
      effectiveVariant = stopsVariantOptions[0].value
    }

    if (effectiveVariant === 'all') return stops // Fallback

    return stops.filter((s) => s.route_code === effectiveVariant)
  }, [stops, selectedVariant, stopsVariantOptions, tab])

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
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-[#0a0a0a] border-b border-[#222]">
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

      {/* Body Container */}
      <div className="flex-1 max-w-2xl w-full mx-auto flex flex-col min-h-0 overflow-y-auto no-scrollbar relative">

        {/* Timetable tab */}
        {tab === 'schedule' && (
          <TimetableView 
            schedule={schedule} 
            scheduleError={scheduleError} 
            onRetry={refreshSchedule} 
            metadata={metadata} 
            onSelectVariant={(v) => { 
              setSelectedVariant(v); 
              setTab('stops');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            stops={stops}
          />
        )}

        {/* Map tab */}
        {tab === 'map' && (
          <div className="flex flex-col h-full min-h-0 px-4 pb-6">
            {/* Dropdown — map tab */}
            {mapVariantOptions.length > 1 && (
              <div className="sticky top-0 z-20 bg-[#0a0a0a] pt-4 px-5 -mx-4 pb-2 border-b border-[#222] mb-4">
                <VariantSelect
                  options={mapVariantOptions}
                  value={selectedVariant}
                  onChange={setSelectedVariant}
                />
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
            <div className="rounded-2xl overflow-hidden border border-surface-muted relative z-0" style={{ height: 420 }}>
              {!stops && !stopsError && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/50 backdrop-blur-sm z-10">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {stopsError && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-md z-10 px-4">
                  <p className="text-sm text-red-400 text-center bg-surface-card p-4 rounded-xl border border-red-500/20 shadow-xl">
                    {stopsError}
                  </p>
                </div>
              )}
              
              {stops && (
                <MapContainer
                  center={[41.0422, 28.993]}
                  zoom={11}
                  className="w-full h-full"
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  {/* Stop markers */}
                  {selectedVariant !== 'all' && stopsForVariant.map((s) => (
                    <CircleMarker
                      key={`${s.direction}-${s.stop_code}-${s.sequence}`}
                      center={[s.latitude, s.longitude]}
                      radius={5}
                      pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 1, weight: 2 }}
                    >
                      <Popup className="route-stop-popup" closeButton={false}>
                        <StopPopupContent s={s} />
                      </Popup>
                    </CircleMarker>
                  ))}
                  {buses
                    ?.filter((b) => !activeDirectionLetter || b.direction_letter === activeDirectionLetter)
                    .map((b) => (
                      <Marker
                        key={b.kapino}
                        position={[b.latitude, b.longitude]}
                        icon={b.direction_letter === 'G' ? busIconG : b.direction_letter === 'D' ? busIconD : busIconUnknown}
                        eventHandlers={{ click: () => setSelectedBus(b) }}
                      />
                    ))}
                </MapContainer>
              )}
            </div>
            
            {selectedBus && (
              <BusDetailSheet
                routeCode={selectedBus.route_code || hatKodu}
                destination={selectedBus.direction || (selectedBus.direction_letter === 'G' ? 'Gidiş' : 'Dönüş')}
                plate={selectedBus.plate}
                kapino={selectedBus.kapino}
                speedKmh={selectedBus.speed}
                busLat={selectedBus.latitude}
                busLon={selectedBus.longitude}
                showMap={true}
                fetchAmenitiesForKapino={selectedBus.kapino}
                onClose={() => setSelectedBus(null)}
              />
            )}
          </div>
        )}

        {/* Stops tab */}
        {tab === 'stops' && (
          <div className="flex flex-col gap-1">
            {/* Dropdown — stops tab */}
            {stopsVariantOptions.length > 1 && (
              <div className="sticky top-0 z-20 bg-[#0a0a0a] pt-4 px-5 -mx-4 pb-2 border-b border-[#222] mb-1">
                <VariantSelect
                  options={stopsVariantOptions}
                  value={selectedVariant === 'all' ? stopsVariantOptions[0].value : selectedVariant}
                  onChange={setSelectedVariant}
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
                <span className="flex-1 text-sm text-slate-200 truncate">
                  {formatStopName(s.stop_name).split(' - ')[0]}
                </span>
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
