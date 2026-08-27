import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useArrivals } from '@/hooks/useArrivals'
import { useQuery } from '@tanstack/react-query'
import { ISTANBUL_BOUNDS, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from '@/utils/mapConstants'
import { api, type RouteAnnouncement, type StopDetail, type BusPosition, type Arrival, type Amenities } from '@/api/client'
import { useFavorites } from '@/hooks/useFavorites'
import { useBottomBar } from '@/hooks/useBottomBar'
import { PINNED_STOPS_MAX, useUserPrefs } from '@/hooks/useUserPrefs'
import { useTranslation } from 'react-i18next'
import { useGlobalNotices } from '@/hooks/useGlobalNotices'
import { etaChipClass } from '@/utils/etaColor'
import { isGpsStale, parseGpsTimestamp } from '@/utils/dateUtils'
import { useTheme } from '@/hooks/useTheme'
import PullToRefresh from '@/components/PullToRefresh'


/** Fixed palette for the first 3 routes at this stop */
const ROUTE_PALETTE = ['var(--color-warning)', 'var(--color-success)', 'var(--color-brand)'] as const

function getRouteColor(routeCode: string, orderedRoutes: string[]): string {
  const idx = orderedRoutes.indexOf(routeCode)
  return idx >= 0 && idx < ROUTE_PALETTE.length ? ROUTE_PALETTE[idx] : '#6b7280'
}

function makeBusIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};border-radius:50%;
      width:14px;height:14px;
      border:2px solid var(--color-bg);
      box-shadow:0 1px 4px rgba(0,0,0,0.6);
      cursor:pointer">
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

/** Haversine distance in metres between two lat/lon points. */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/** Auto-fits map to given bounds on mount. */
function FitBoundsEffect({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap()
  useEffect(() => { map.fitBounds(bounds, { padding: [32, 32] }) }, [map, bounds])
  return null
}

interface InfoModalProps {
  onClose: () => void
  onForceRefresh: () => void
  clientTime: string
  serverTime: string
  gpsTime: string
}

function InfoModal({ onClose, onForceRefresh, clientTime, serverTime, gpsTime }: InfoModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    btnRef.current?.focus()
    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        if (!modalRef.current) return
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-sm bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-6"
      >
        <h2 id="info-title" className="text-lg font-bold text-text-primary mb-3">
          {t('stops.timestamps')}
        </h2>

        {/* Architecture flow diagram using emojis */}
        <div className="p-3 mb-4 bg-surface-muted/30 border border-surface-border rounded-xl flex flex-col items-center">
          {/* Top Node: iett-middle */}
          <div className="flex flex-col items-center text-center">
            <span className="text-2xl mb-0.5">☁️</span>
            <span className="text-[11px] font-bold text-brand-400 font-mono">iett-middle</span>
            <span className="text-[9px] text-text-muted">{t('stops.serverNodeSub')}</span>
          </div>

          {/* Connection Arrows: ↙ (middle -> pwa), ↖ (istanbul -> middle) */}
          <div className="w-full flex items-center justify-around px-8 my-1 text-text-muted text-xs font-bold font-mono">
            <span>↙</span>
            <span>↖</span>
          </div>

          {/* Bottom Nodes: Left = iett-pwa (Client), Right = iett.istanbul (Bus/Field) */}
          <div className="w-full flex items-center justify-between px-2">
            <div className="flex flex-col items-center text-center max-w-[100px]">
              <span className="text-2xl mb-0.5">📱</span>
              <span className="text-[11px] font-bold text-text-primary font-mono">iett-pwa</span>
              <span className="text-[9px] text-text-muted">{t('stops.clientNodeSub')}</span>
            </div>

            <div className="flex flex-col items-center text-center max-w-[100px]">
              <span className="text-2xl mb-0.5">🚌</span>
              <span className="text-[11px] font-bold text-text-primary font-mono">iett.istanbul</span>
              <span className="text-[9px] text-text-muted">{t('stops.fieldNodeSub')}</span>
            </div>
          </div>
        </div>

        <div tabIndex={0} className="text-xs text-text-secondary space-y-3 mb-6 overflow-y-auto max-h-[40vh]">
          <div className="p-3 bg-surface-muted/50 rounded-xl border border-surface-border space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span>📱 {t('stops.cardClientTitle')}</span>
              <span className="font-mono text-brand-400">{clientTime}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.timestampDescUpdate')}
            </p>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-xl border border-surface-border space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span>☁️ {t('stops.cardServerTitle')}</span>
              <span className="font-mono text-brand-400">{serverTime}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.timestampDescIett')}
            </p>
          </div>

          <div className="p-3 bg-surface-muted/50 rounded-xl border border-surface-border space-y-1">
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span>🛰️ {t('stops.cardGpsTitle')}</span>
              <span className="font-mono text-brand-400">{gpsTime}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('stops.gpsTimeDesc')}
              {(gpsTime === '--:--:--' || !gpsTime) && (
                <span className="block mt-1 text-amber-400/90 font-medium">
                  {t('stops.gpsTimeNoBusesNote')}
                </span>
              )}
            </p>
          </div>

          <p className="text-[11px] text-amber-400/90 leading-relaxed px-1">
            {t('stops.timestampLagWarning')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            ref={btnRef}
            onClick={() => {
              onForceRefresh()
              onClose()
            }}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {t('stops.forceRefresh')}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-surface-muted hover:bg-slate-600 text-text-secondary font-semibold rounded-xl text-xs transition-colors"
          >
            {t('common.gotIt')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

/**
 * Fits the map to include the stop marker + up to 3 nearest buses (those
 * already present in `buses`).  Only fires once — the first time buses
 * contains at least one entry.  Falls back to the default center/zoom when
 * no buses have live positions.
 */
function AutoFitBuses({
  stopLat,
  stopLon,
  buses,
  filterKey,
}: {
  stopLat: number
  stopLon: number
  buses: BusPosition[]
  filterKey: string
}) {
  const map = useMap()
  const lastFilterKey = useRef<string | null>(null)
  const hasFitOnce = useRef(false)

  useEffect(() => {
    const withPos = buses.filter((b) => b.latitude != null && b.longitude != null).slice(0, 3)

    const isFilterChange = lastFilterKey.current !== filterKey
    const isInitialData = !hasFitOnce.current && withPos.length > 0

    if (withPos.length > 0) hasFitOnce.current = true

    if (!isFilterChange && !isInitialData) return

    lastFilterKey.current = filterKey

    if (withPos.length === 0) {
      map.flyTo([stopLat, stopLon], 16, { animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, duration: 0.2 })
      return
    }

    const points: L.LatLngExpression[] = [
      [stopLat, stopLon],
      ...withPos.map((b): L.LatLngExpression => [b.latitude, b.longitude]),
    ]
    const bounds = L.latLngBounds(points)
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, duration: 0.2 })
  }, [filterKey, buses, stopLat, stopLon, map])

  return null
}

/** Amenity icon row — rendered below the info strip when amenities data is present. */
function AmenityIcons({ amenities }: { amenities: Amenities | null }) {
  const { t } = useTranslation()
  if (!amenities) return null
  const items: { label: string; icon: string; value: boolean | null | undefined }[] = [
    { label: t('amenities.usb'), icon: '🔌', value: amenities.usb },
    { label: t('amenities.wifi'), icon: '📶', value: amenities.wifi },
    { label: t('amenities.ac'), icon: '❄️', value: amenities.ac },
    { label: t('amenities.accessible'), icon: '♿', value: amenities.accessible },
  ]
  const known = items.filter((i) => i.value != null)
  if (known.length === 0) return null
  return (
    <div className="px-4 py-3 flex gap-3 justify-center flex-wrap">
      {known.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            item.value
              ? 'bg-emerald-900/50 text-emerald-400'
              : 'bg-surface-muted text-text-muted line-through'
          }`}
        >
          {item.icon} {item.label}
        </span>
      ))}
    </div>
  )
}

/** Bottom-sheet showing a single bus relative to the stop. */
function BusDetailSheet({
  arrival,
  busPos,
  stopLat,
  stopLon,
  stopName: _stopName,
  onClose,
}: {
  arrival: Arrival
  busPos: BusPosition | null
  stopLat: number
  stopLon: number
  stopName: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [mapReady, setMapReady] = useState(false)
  const { theme } = useTheme()

  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement

    const timer = setTimeout(() => {
      if (dialogRef.current) {
        dialogRef.current.focus()
      }
    }, 50)
    return () => {
      clearTimeout(timer)
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
        return
      }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prefer live position from ntcapi ybs arrival; fall back to fleet-store busPos.
  const effectiveLat = arrival.lat ?? busPos?.latitude ?? null
  const effectiveLon = arrival.lon ?? busPos?.longitude ?? null
  const hasPosition = effectiveLat !== null && effectiveLon !== null

  const dist =
    hasPosition ? haversineM(effectiveLat!, effectiveLon!, stopLat, stopLon) : null
  const distLabel =
    dist !== null
      ? dist < 1000
        ? `${Math.round(dist)} m`
        : `${(dist / 1000).toFixed(1)} km`
      : null

  const mapCenter: [number, number] = hasPosition
    ? [(effectiveLat! + stopLat) / 2, (effectiveLon! + stopLon) / 2]
    : [stopLat, stopLon]

  const bounds: [[number, number], [number, number]] | null = useMemo(() => hasPosition
    ? [
        [Math.min(effectiveLat!, stopLat), Math.min(effectiveLon!, stopLon)],
        [Math.max(effectiveLat!, stopLat), Math.max(effectiveLon!, stopLon)],
      ]
    : null, [hasPosition, effectiveLat, stopLat, effectiveLon, stopLon])

  const busIcon = L.divIcon({
    className: '',
    html: `<div style="background:var(--color-warning);border-radius:50%;width:14px;height:14px;border:2px solid var(--color-bg);box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  const stopIcon = L.divIcon({
    className: '',
    html: `<div style="background:var(--color-brand);border-radius:50%;width:14px;height:14px;border:2px solid var(--color-bg);box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

  const y = useMotionValue(0)
  const backdropOpacity = useTransform(y, [0, 800], [1, 0])

  return (
    <div className="fixed inset-0 z-[2000] flex items-end pointer-events-none">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bus-detail-title"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose()
          }
        }}
        style={{ y }}
        initial={{ y: 800 }}
        animate={{ y: 0 }}
        exit={{ y: 800 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        onAnimationComplete={() => setMapReady(true)}
        className="relative w-full max-w-2xl mx-auto bg-surface-card border-t border-surface-border rounded-t-2xl overflow-hidden shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" style={{ cursor: 'grab' }}>
          <div className="w-10 h-1.5 rounded-full bg-slate-600/80 hover:bg-slate-500 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div
            className="text-white font-mono font-bold text-sm rounded-xl px-3 py-1.5 shrink-0"
            style={{ backgroundColor: arrival.route_code ? 'var(--color-warning)' : 'var(--color-text-3)' }}
          >
            {arrival.route_code}
          </div>
          <div className="flex-1 min-w-0">
            <p id="bus-detail-title" className="text-sm font-semibold text-text-primary truncate">{arrival.destination}</p>
            {(arrival.plate || arrival.kapino) && (
              <p className="text-xs text-text-secondary font-mono">
                {[arrival.plate, arrival.kapino].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-secondary shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map — bus ↔ stop */}
        {hasPosition ? (
          <div style={{ height: 200 }} className="relative bg-surface-muted/20">
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {mapReady && (
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer
                  attribution='&copy; CartoDB'
                  url={`https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`}
                />
                {bounds && <FitBoundsEffect bounds={bounds} />}
                <Polyline
                  positions={[[effectiveLat!, effectiveLon!], [stopLat, stopLon]]}
                  pathOptions={{ color: 'var(--color-warning)', weight: 2, dashArray: '6 4', opacity: 0.7 }}
                />
                <Marker position={[effectiveLat!, effectiveLon!]} icon={busIcon} />
                <Marker position={[stopLat, stopLon]} icon={stopIcon} />
              </MapContainer>
            )}
          </div>
        ) : (
          <div className="h-12 flex items-center justify-center">
            <p className="text-xs text-text-muted">{t('stops.noPosition')}</p>
          </div>
        )}

        {/* Info strip — 4 cols: ETA · Mesafe · Hız · Plaka */}
        <div className="px-4 py-3 grid grid-cols-4 gap-2 border-t border-surface-muted">
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('stops.eta')}</p>
            <p className="text-base font-bold text-text-primary">
              {arrival.eta_minutes !== null ? `${arrival.eta_minutes} dk` : arrival.eta_raw}
            </p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('stops.distance')}</p>
            <p className="text-base font-bold text-text-primary">{distLabel ?? '—'}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('stops.speed')}</p>
            <p className="text-base font-bold text-text-primary">
              {arrival.speed_kmh !== null ? `${arrival.speed_kmh} km/h` : '—'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('stops.plate')}</p>
            <p className="text-sm font-bold text-text-primary font-mono">{arrival.plate ?? '—'}</p>
          </div>
        </div>

        {/* Double update time (GPS Last Seen) */}
        {arrival.last_seen_ts && (
          <div className="flex justify-center items-center gap-1.5 pb-2 pt-1 border-b border-surface-border">
            {isGpsStale(arrival.last_seen_ts) && (
              <span
                title={t('arac.staleDataWarning')}
                aria-label={t('arac.staleDataWarning')}
                className="text-xs cursor-help"
              >
                ⚠️
              </span>
            )}
            <p className={`text-[10px] font-mono tracking-wide ${isGpsStale(arrival.last_seen_ts) ? 'text-amber-400 font-semibold' : 'text-text-muted'}`}>
              {t('stops.gpsUpdate', 'GPS Update')}: {arrival.last_seen_ts}
            </p>
          </div>
        )}

        {/* Amenity icons */}
        <AmenityIcons amenities={arrival.amenities} />

        {/* CTA */}
        <div className="px-4 pb-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              to={`/routes/${arrival.route_code}`}
              onClick={onClose}
              className="block w-full text-center bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {t('stops.openRoute')}
            </Link>

            <button
              onClick={() => {
                if (!arrival.kapino) return
                onClose()
                navigate(`/arac/bus/${encodeURIComponent(arrival.kapino)}`)
              }}
              disabled={!arrival.kapino}
              className="w-full text-center border border-surface-border text-brand-primary font-semibold
                         py-3 rounded-xl text-sm transition-colors disabled:text-text-muted
                         disabled:border-surface-muted disabled:cursor-not-allowed hover:border-brand-primary/60"
            >
              {t('stops.moreDetail')}
            </button>
          </div>

          {!arrival.kapino && (
            <p className="text-[11px] text-text-muted mt-2">
              {t('stops.noKapinoWarning')}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function EtaChip({ minutes, raw }: { minutes: number | null; raw: string }) {
  const chipCls = etaChipClass(minutes)
  if (minutes === null)
    return (
      <span className="inline-flex items-center justify-center bg-surface-muted text-text-secondary text-xs font-semibold
                        px-2.5 py-1 rounded-full min-w-[52px]">
        {raw}
      </span>
    )
  return (
    <span className={`inline-flex items-center justify-center text-xs font-bold
                      px-2.5 py-1 rounded-full min-w-[52px] ${chipCls}`}>
      {minutes} dk
    </span>
  )
}

const globalRouteIconCache = new Map<string, L.DivIcon>()

export default function StopPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { dcode } = useParams<{ dcode: string }>()
  const navigate = useNavigate()
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set())
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null)
  const [activeTab, setActiveTab] = useState<'gelis' | 'hatlar' | 'bilgi'>('gelis')
  const [showInfo, setShowInfo] = useState(false)

  const handleCloseBusSheet = useCallback(() => setSelectedArrival(null), [])

  // Sliding panel state — map height as percentage of split container
  const mapHeightPctRef = useRef(40)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const dragHandleRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ startY: number; startPct: number } | null>(null)
  const dragRafId = useRef<number | null>(null)

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startY: e.clientY, startPct: mapHeightPctRef.current }
  }, [])

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !splitContainerRef.current || !mapContainerRef.current) return
    const containerH = splitContainerRef.current.offsetHeight
    const dy = e.clientY - dragState.current.startY
    const deltaPct = (dy / containerH) * 100
    const newPct = Math.min(65, Math.max(15, dragState.current.startPct + deltaPct))

    if (dragRafId.current) cancelAnimationFrame(dragRafId.current)

    dragRafId.current = requestAnimationFrame(() => {
      if (!mapContainerRef.current) return
      mapHeightPctRef.current = newPct
      mapContainerRef.current.style.height = `${newPct}%`
      if (dragHandleRef.current) {
        dragHandleRef.current.setAttribute('aria-valuenow', Math.round(newPct).toString())
      }
      window.dispatchEvent(new Event('resize'))
    })
  }, [])

  const onHandlePointerUp = useCallback(() => {
    dragState.current = null
    if (dragRafId.current) {
      cancelAnimationFrame(dragRafId.current)
      dragRafId.current = null
    }
  }, [])

  const onHandleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mapContainerRef.current) return
    const step = 5
    let newPct = mapHeightPctRef.current
    if (e.key === 'ArrowUp') {
      newPct = Math.max(15, newPct - step)
      e.preventDefault()
    } else if (e.key === 'ArrowDown') {
      newPct = Math.min(65, newPct + step)
      e.preventDefault()
    } else {
      return
    }
    mapHeightPctRef.current = newPct
    mapContainerRef.current.style.height = `${newPct}%`
    if (dragHandleRef.current) {
      dragHandleRef.current.setAttribute('aria-valuenow', Math.round(newPct).toString())
    }
    window.dispatchEvent(new Event('resize'))
  }, [])

  // Reset to default tab whenever the stop changes (React Router may reuse this component)
  useEffect(() => { setActiveTab('gelis') }, [dcode])

  // Memoised so useBottomBar’s effect only fires when tab active-state actually changes
  const bottomBarTabs = useMemo(() => [
    {
      label: t('stops.arrivals'),
      icon: (
        <svg viewBox="0 0 24 24" fill={activeTab === 'gelis' ? 'currentColor' : 'none'}
             stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
      onPress: () => setActiveTab('gelis'),
      active: activeTab === 'gelis',
    },
    {
      label: t('stops.routes'),
      icon: (
        <svg viewBox="0 0 24 24" fill={activeTab === 'hatlar' ? 'currentColor' : 'none'}
             stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
      onPress: () => setActiveTab('hatlar'),
      active: activeTab === 'hatlar',
    },
    {
      label: t('stops.info'),
      icon: (
        <svg viewBox="0 0 24 24" fill={activeTab === 'bilgi' ? 'currentColor' : 'none'}
             stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      onPress: () => setActiveTab('bilgi'),
      active: activeTab === 'bilgi',
    },
  ], [activeTab, t])

  useBottomBar(bottomBarTabs)

  const { data: arrivals, loading, error, stale, refresh: refreshArrivals, lastUpdated, iettUpdatedAt } = useArrivals(dcode ?? '')

  const maxGpsTime = useMemo(() => {
    if (!arrivals || arrivals.length === 0 || !lastUpdated) return null
    const nowMs = lastUpdated.getTime()
    let newestMs = 0
    let newestStr = ''

    for (const a of arrivals) {
      if (!a.last_seen_ts) continue
      const ts = a.last_seen_ts.trim()
      const dateObj = parseGpsTimestamp(ts, nowMs)

      if (dateObj) {
        const tMs = dateObj.getTime()
        if (tMs <= nowMs + 60_000 && tMs > newestMs) {
          newestMs = tMs
          newestStr = ts.length > 8 && ts.includes('T')
            ? dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : ts
        }
      } else if (ts && !newestStr) {
        newestStr = ts
      }
    }
    return newestStr || null
  }, [arrivals, lastUpdated])

  const serverTimeDisplay = useMemo(() => {
    if (!iettUpdatedAt) return '--:--:--'
    const parsed = new Date(iettUpdatedAt)
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
    return iettUpdatedAt
  }, [iettUpdatedAt])

  const clientTimeDisplay = useMemo(() => {
    return lastUpdated
      ? lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '--:--:--'
  }, [lastUpdated])

  const iettTimeDisplay = useMemo(() => {
    if (maxGpsTime) return maxGpsTime
    return serverTimeDisplay
  }, [maxGpsTime, serverTimeDisplay])

  const { data: routes } = useQuery<string[]>({
    queryKey: ['routesAtStop', dcode],
    queryFn: () => api.stops.routes(dcode ?? ''),
    refetchInterval: 300_000,
    enabled: !!dcode,
  })

  const { data: stopDetail } = useQuery<StopDetail>({
    queryKey: ['stopDetail', dcode],
    queryFn: () => api.stops.detail(dcode ?? ''),
    refetchInterval: 3_600_000,
    enabled: !!dcode,
  })

  // Ordered unique routes from live arrivals (used for colour assignment)
  const arrivalRouteOrder = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const a of (arrivals ?? [])) {
      if (!seen.has(a.route_code)) { seen.add(a.route_code); result.push(a.route_code) }
    }
    return result
  }, [arrivals])

  const orderedForColors = useMemo(() => {
    if (activeRoutes.size === 0) return arrivalRouteOrder
    return Array.from(activeRoutes)
  }, [activeRoutes, arrivalRouteOrder])

  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.
  // Derive bus positions from arrivals (which already carry lat/lon from YBS response).
  const routeBuses = useMemo<BusPosition[]>(
    () =>
      (arrivals ?? [])
        .filter((a): a is Arrival & { lat: number; lon: number } =>
          a.lat != null && a.lon != null && a.kapino != null,
        )
        .map((a) => ({
          kapino: a.kapino!,
          plate: a.plate ?? null,
          latitude: a.lat,
          longitude: a.lon,
          speed: null,
          operator: null,
          last_seen: '',
          route_code: a.route_code,
          route_name: null,
          direction: null,
          direction_letter: null,
          nearest_stop: null,
          stop_sequence: null,
          trail: [],
        })),
    [arrivals],
  )

  const filteredRouteBuses = useMemo(() => {
    if (activeRoutes.size === 0) return routeBuses
    return routeBuses.filter(b => activeRoutes.has(b.route_code ?? ''))
  }, [routeBuses, activeRoutes])

  // One cached Leaflet DivIcon per route_code — avoids creating a new DOM object every render.
  const routeIconMap = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    const allRouteSet = new Set([...arrivalRouteOrder, ...(routes ?? [])])
    allRouteSet.forEach((r) => {
      const color = getRouteColor(r, orderedForColors)
      const cacheKey = `${r}-${color}`
      if (!globalRouteIconCache.has(cacheKey)) {
        globalRouteIconCache.set(cacheKey, makeBusIcon(color))
      }
      const icon = globalRouteIconCache.get(cacheKey)!
      m.set(r, icon)
    })
    return m
  }, [arrivalRouteOrder, routes, orderedForColors])

  const { data: polledAnnouncements, isError: isAnnsError, isLoading: isAnnsLoading } = useQuery<RouteAnnouncement[]>({
    queryKey: ['stopAnnouncements', dcode],
    queryFn: async ({ signal }) => {
      if (!dcode) return []
      return await api.stops.announcements(dcode, { signal })
    },
    refetchInterval: 300_000,
    enabled: !!dcode,
    placeholderData: (prev) => prev,
  })

  const { data: globalNotices } = useGlobalNotices()

  const stopAnnouncements: RouteAnnouncement[] = useMemo(() => {
    const raw = polledAnnouncements ?? []

    return [
      ...(globalNotices ?? []).map(gn => ({
        type: t('stops.systemAnnouncementType', 'Sistem Genel Duyuru'),
        updated_at: new Date(gn.notice_starttime).toLocaleDateString('tr-TR'),
        message: `${gn.notice_title}\n\n${gn.notice_body}`,
        route_code: 'GENEL',
        route_name: t('stops.systemAnnouncements', 'Sistem Uyarıları')
      })),
      ...raw
    ]
  }, [globalNotices, polledAnnouncements, t])

  const { isFavorite, toggle } = useFavorites()
  const { prefs, isPinned, pinStop, unpinStop } = useUserPrefs()
  const stopName = stopDetail?.name ?? `${t('stops.title')} ${dcode}`
  const favItem = { kind: 'stop' as const, dcode: dcode ?? '', name: stopName }
  const favorited = isFavorite(favItem)
  const pinned = isPinned(dcode ?? '')
  const pinAtLimit = !pinned && (prefs?.pinnedStops.length ?? 0) >= PINNED_STOPS_MAX

  const toggleRoute = useCallback((r: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }, [])

  // Arrivals filtered by selected routes, sorted ascending by ETA
  const filteredArrivals = useMemo(
    () => {
      const base = activeRoutes.size > 0
        ? (arrivals ?? []).filter((a) => activeRoutes.has(a.route_code))
        : (arrivals ?? [])
      return [...base].sort((a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999))
    },
    [arrivals, activeRoutes],
  )

  // Fetch live bus positions for ALL routes present in arrivals (up to MAX_LIVE_ROUTES).
  // Index routeBuses by kapino for O(1) lookup in each arrival row.
  const busByKapino = useMemo(() => {
    const m = new Map<string, BusPosition>()
    routeBuses.forEach((b) => m.set(b.kapino, b))
    return m
  }, [routeBuses])

  // O(1) arrival lookup by kapino — used by bus map markers to open BusDetailSheet
  const arrivalByKapino = useMemo(() => {
    const m = new Map<string, Arrival>()
    ;(arrivals ?? []).forEach((a) => { if (a.kapino) m.set(a.kapino, a) })
    return m
  }, [arrivals])

  const isIettStale = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    if (iettUpdatedAt) {
      const parsed = new Date(iettUpdatedAt).getTime()
      if (!isNaN(parsed)) return now - parsed > 300_000
    }
    if (lastUpdated) {
      return now - lastUpdated.getTime() > 300_000
    }
    return false
  }, [iettUpdatedAt, lastUpdated])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted shrink-0 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-text-secondary hover:text-text-primary p-1 -ml-1 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-text-primary truncate">{stopName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] bg-surface-muted text-text-secondary px-1.5 py-0.5 rounded font-mono shrink-0">
                #{dcode}
              </span>
              {stopDetail && stopDetail.direction && (
                <span className="text-[11px] text-text-secondary truncate leading-tight uppercase tracking-wider">{t('stops.directionLabel', { direction: stopDetail.direction })}</span>
              )}
            </div>
            {stale && <p className="text-[11px] text-amber-400">{t('stops.staleWarning')}</p>}
          </div>



          <button
            onClick={() => toggle(favItem)}
            className={`p-1.5 rounded-xl transition-colors shrink-0 ${
              favorited ? 'text-rose-400' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <svg className="w-5 h-5" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (!dcode) return
              if (pinAtLimit) return
              if (pinned) unpinStop(dcode)
              else pinStop(dcode, stopName)
            }}
            disabled={!dcode || pinAtLimit}
            aria-label={
              pinAtLimit
                ? t('stops.pinAtLimit', { max: PINNED_STOPS_MAX })
                : pinned ? t('stops.unpinStop') : t('stops.pinStop')
            }
            aria-pressed={pinned}
            title={
              pinAtLimit
                ? t('stops.pinLimit', { max: PINNED_STOPS_MAX })
                : pinned ? t('stops.unpinStop') : t('stops.pinStop')
            }
            className={`p-1.5 rounded-xl transition-colors shrink-0 disabled:opacity-40 ${
              pinned ? 'text-amber-400' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="text-base leading-none">{pinned ? '📌' : '📍'}</span>
          </button>
        </div>
      </div>

      {/* ── Hatlar tab ────────────────────────────────────────────────────── */}
      {activeTab === 'hatlar' && (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {routes === null || routes === undefined ? (
            <p className="text-center text-text-muted mt-10 text-sm">{t('common.loading')}</p>
          ) : routes.length === 0 ? (
            <p className="text-center text-text-muted mt-10 text-sm">{t('common.noData')}</p>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-surface-border divide-y divide-surface-border bg-surface-card">
              {(routes ?? []).map((r) => (
                <button
                  key={r}
                  onClick={() => navigate(`/routes/${r}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted
                             active:bg-surface-muted transition-colors text-left"
                >
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded font-mono text-white"
                    style={{ backgroundColor: getRouteColor(r, orderedForColors) }}
                  >
                    {r}
                  </span>
                  <span className="flex-1 text-sm text-text-secondary">{t('routes.info')}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                       className="w-4 h-4 text-text-muted shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bilgi tab ────────────────────────────────────────────────────── */}
      {activeTab === 'bilgi' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card divide-y divide-surface-border overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-text-muted">{t('stops.stopCode', { defaultValue: 'Durak Kodu' })}</span>
              <span className="font-mono text-sm text-text-primary">{dcode}</span>
            </div>
            {stopDetail?.name && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-muted">{t('stops.stopName', { defaultValue: 'Ad' })}</span>
                <span className="text-sm text-text-primary text-right max-w-[60%]">{stopDetail.name}</span>
              </div>
            )}
            {stopDetail?.direction && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-muted">{t('stops.stopDirection', { defaultValue: 'Yön' })}</span>
                <span className="text-sm text-text-primary text-right max-w-[60%]">{stopDetail.direction}</span>
              </div>
            )}
            {stopDetail?.latitude != null && stopDetail?.longitude != null && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-muted">{t('stops.stopLocation', { defaultValue: 'Konum' })}</span>
                <span className="font-mono text-xs text-text-secondary">
                  {stopDetail.latitude.toFixed(5)}, {stopDetail.longitude.toFixed(5)}
                </span>
              </div>
            )}
          </div>
          {stopDetail && <AmenityIcons amenities={(stopDetail as StopDetail & { amenities?: Amenities }).amenities ?? null} />}
        </div>
      )}

      {/* Split-screen body — shown on Geliş tab */}
      {activeTab === 'gelis' && (
      <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden max-w-2xl w-full mx-auto min-h-0">

        {/* Map — dynamically sized via drag */}
        <div className="shrink-0 border-b border-surface-muted relative" style={{ height: '50%' }} ref={(el) => { mapContainerRef.current = el; if (el) el.style.height = `${mapHeightPctRef.current}%` }}>
          {stopDetail && stopDetail.latitude != null && stopDetail.longitude != null ? (
            <MapContainer
              center={[stopDetail.latitude, stopDetail.longitude]}
              zoom={16}
              minZoom={MAP_MIN_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
              maxBounds={ISTANBUL_BOUNDS}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%' }}
              key={dcode}
            >
              {/* MapResizer removed, relying on resize events */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url={`https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`}
                keepBuffer={2}
                updateWhenIdle={true}
                updateWhenZooming={false}
              />
              <AutoFitBuses
                stopLat={stopDetail.latitude}
                stopLon={stopDetail.longitude}
                buses={filteredRouteBuses}
                filterKey={Array.from(activeRoutes).join(',')}
              />
              <CircleMarker
                center={[stopDetail.latitude, stopDetail.longitude]}
                radius={14}
                pathOptions={{ color: 'var(--color-brand)', weight: 3, fillColor: 'var(--color-brand)', fillOpacity: 1 }}
              >
                <Popup minWidth={160}>
                  <div className="popup-card">
                    <p className="popup-stop-name">{stopName}</p>
                    {stopDetail.direction && (
                      <span className="popup-direction-badge">&#8594; {stopDetail.direction}</span>
                    )}
                    <p className="popup-label">#{dcode}</p>
                  </div>
                </Popup>
              </CircleMarker>
              {/* Live bus markers — clicking opens the rich BusDetailSheet */}
              {filteredRouteBuses.map((b) => {
                const icon = (b.route_code ? routeIconMap.get(b.route_code) : undefined) ?? makeBusIcon('#6b7280')
                return (
                  <Marker
                    key={`${b.kapino}-${b.route_code ?? ''}`}
                    position={[b.latitude, b.longitude]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        const matched = arrivalByKapino.get(b.kapino) ?? null
                        if (matched) setSelectedArrival(matched)
                      },
                    }}
                  />
                )
              })}
            </MapContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-text-muted">
              {!stopDetail ? (
                <>
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs">{t('common.loading')}</p>
                </>
              ) : (
                <p className="text-xs">{t('common.noData')}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Drag handle ──────────────────────────────────────────────── */}
        <div
            ref={dragHandleRef}
            role="separator"
            aria-valuenow={mapHeightPctRef.current}
            aria-valuemin={15}
            aria-valuemax={65}
            aria-label={t('stops.heightAdjust', 'Harita yüksekliğini ayarla')}
            tabIndex={0}
            className="shrink-0 flex items-center justify-center h-5 cursor-row-resize select-none touch-none bg-surface-card border-b border-surface-muted active:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            onKeyDown={onHandleKeyDown}
          >
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Arrivals — scrollable, items must not shrink */}
        <PullToRefresh
          onRefresh={async () => {
            refreshArrivals()
            await new Promise(r => setTimeout(r, 600))
          }}
        >
          <div className="px-4 pt-2 pb-4">
          {/* Announcements Section */}
          <div className="mb-2">
            {isAnnsLoading && polledAnnouncements === undefined ? (
              <div className="w-full card flex items-center justify-between text-sm text-text-muted font-medium cursor-default select-none">
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin text-xs">⌛</span> {t('stops.loadingAnnouncements', 'Duyurular yükleniyor...')}
                </span>
              </div>
            ) : isAnnsError && stopAnnouncements.length === 0 ? (
              <div className="w-full card flex items-center justify-between text-sm text-amber-400/90 font-medium border-amber-900/40 bg-amber-950/10 cursor-default select-none">
                <span>⚠️ {t('stops.announcementsFailed', 'Duyurular yüklenirken geçici bir hata oluştu.')}</span>
              </div>
            ) : stopAnnouncements.length === 0 ? (
              <div className="w-full card flex items-center justify-between text-sm text-text-muted font-medium cursor-default select-none opacity-80">
                <span>ℹ️ {t('stops.noAnnouncements', 'Aktif duyuru yok')}</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  id="announcements-btn"
                  aria-expanded={showAnnouncements}
                  aria-controls="announcements-list"
                  onClick={() => setShowAnnouncements(!showAnnouncements)}
                  className="w-full card flex items-center justify-between text-sm text-amber-400 font-semibold hover:bg-surface-muted/50 transition-colors"
                >
                  <span>⚠️ {t('stops.announcements', 'Duyurular')} ({stopAnnouncements.length})</span>
                  <svg className={`w-4 h-4 transition-transform ${showAnnouncements ? 'rotate-180' : ''}`}
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                  </svg>
                </button>
                {showAnnouncements && (
                  <div id="announcements-list" role="region" aria-labelledby="announcements-btn" className="mt-2 flex flex-col gap-2">
                    {stopAnnouncements.map((ann) => (
                      <div key={`${ann.route_code}-${ann.type}-${ann.message}-${ann.updated_at}`} className="card border-amber-800/50 bg-amber-950/20">
                        <p className="text-xs font-semibold text-amber-400 mb-1">
                          {ann.route_code && <span className="text-amber-200 mr-1">[{ann.route_code}]</span>}
                          {ann.type}
                        </p>
                        <p className="text-sm text-text-secondary">{ann.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {error && !stale && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {loading && !arrivals && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="card h-12 animate-pulse bg-surface-muted border-0" />
              ))}
            </div>
          )}

          {arrivals && filteredArrivals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <p className="text-sm font-medium">{t('stops.noArrivals')}</p>
              {activeRoutes.size > 0 && (
                <p className="text-xs mt-1">{t('stops.noDataForRoute', { defaultValue: '{{route}} hattı için veri yok', route: Array.from(activeRoutes).join(', ') })}</p>
              )}
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredArrivals.map((a, i) => {
              const routeColor = getRouteColor(a.route_code, orderedForColors)
              const hasVehicle = !!(a.kapino || a.plate)
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={`${a.route_code}-${a.destination}-${a.kapino || a.eta_raw || i}`}
                  className="mb-2 shrink-0 card flex items-stretch gap-0 py-0 overflow-hidden hover:border-slate-500 transition-colors"
                >
                  {/* LEFT half — navigate to route page */}
                  <Link
                    to={`/routes/${a.route_code}`}
                    className="flex items-center gap-3 flex-1 min-w-0 py-2 px-3"
                  >
                    <div
                      style={{ backgroundColor: routeColor }}
                      className="text-white font-mono font-bold text-xs rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shrink-0 leading-tight"
                    >
                      {a.route_code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-text-primary truncate leading-snug">{a.destination}</p>
                        {isGpsStale(a.last_seen_ts) && (
                          <span
                            title={t('arac.staleDataWarning')}
                            aria-label={t('arac.staleDataWarning')}
                            className="text-xs shrink-0 cursor-help"
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                      {hasVehicle && (
                        <p className="text-xs text-text-secondary mt-0.5 font-mono tracking-wide">
                          {[a.plate, a.kapino].filter(Boolean).join('  ·  ')}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Divider */}
                  <div className="w-px bg-surface-muted shrink-0 my-2" />

                  {/* RIGHT half — open single-bus sheet */}
                  <button
                    onClick={() => setSelectedArrival(a)}
                    className="shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2 hover:bg-surface-muted/50 transition-colors"
                  >
                    <EtaChip minutes={a.eta_minutes} raw={a.eta_raw} />
                    <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>

          </div>
        </PullToRefresh>

        {/* ── Bottom strip: last updated + refresh + route filter chips ────── */}
        <div className="shrink-0 border-t border-surface-muted bg-surface-card pb-2">
          {/* Last updated row */}
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[11px] text-text-muted flex items-center gap-1 flex-wrap">
              {lastUpdated ? (
                <>
                  <span>
                    {t('stops.lastUpdated', { time: lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), defaultValue: 'güncelleme: {{time}}' })}
                  </span>
                  {', '}
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] transition-colors ${
                      isIettStale
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                        : 'bg-surface-muted text-text-secondary'
                    }`}
                  >
                    iett: {iettTimeDisplay}
                  </span>
                </>
              ) : (
                t('common.loading')
              )}
              {(iettUpdatedAt || (arrivals && arrivals.length > 0)) && (
                <button
                  onClick={() => setShowInfo(true)}
                  aria-label={t('stops.lagExplanationAria', 'Neden iki farklı saat var?')}
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-surface-muted text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                >
                  i
                </button>
              )}
            </span>
            <button
              onClick={() => refreshArrivals()}
              className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {t('common.refresh')}
            </button>
          </div>

          {(routes ?? []).length > 0 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveRoutes(new Set())}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeRoutes.size === 0
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-muted text-text-secondary hover:bg-slate-600'
                }`}
              >
                {t('common.all', 'Tümü')}
              </button>
              {(routes ?? []).map((r) => {
                const color = getRouteColor(r, orderedForColors)
                const isActive = activeRoutes.has(r)
                const isTop3 =
                  arrivalRouteOrder.includes(r) &&
                  arrivalRouteOrder.indexOf(r) < ROUTE_PALETTE.length
                return (
                  <button
                    key={r}
                    onClick={() => toggleRoute(r)}
                    style={
                      isActive
                        ? { backgroundColor: color, borderColor: color }
                        : isTop3
                        ? { borderColor: color, color, backgroundColor: color + '22' }
                        : {}
                    }
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      isActive
                        ? 'text-white border-transparent'
                        : isTop3
                        ? 'border'
                        : 'bg-surface-muted text-text-secondary border-transparent hover:bg-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Bus detail sheet — rendered outside the scroll container so it overlays everything */}
      <AnimatePresence>
        {selectedArrival && stopDetail?.latitude != null && stopDetail.longitude != null && (
          <BusDetailSheet
            key="bus-detail-sheet"
            arrival={selectedArrival}
            busPos={selectedArrival.kapino ? (busByKapino.get(selectedArrival.kapino) ?? null) : null}
            stopLat={stopDetail.latitude}
            stopLon={stopDetail.longitude}
            stopName={stopName}
            onClose={handleCloseBusSheet}
          />
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <InfoModal
            key="info-modal"
            onClose={() => setShowInfo(false)}
            onForceRefresh={() => refreshArrivals()}
            clientTime={clientTimeDisplay}
            serverTime={serverTimeDisplay}
            gpsTime={maxGpsTime || '--:--:--'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
