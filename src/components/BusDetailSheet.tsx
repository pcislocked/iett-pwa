import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { api } from '@/api/client'
import type { Amenities } from '@/api/client'

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
  useEffect(() => { map.fitBounds(bounds, { padding: [32, 32] }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Amenity icon row */
function AmenityIcons({ amenities, isLoading }: { amenities: Amenities | null, isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="px-4 pb-2 flex gap-3 justify-center flex-wrap">
        <div className="h-5 w-16 bg-surface-muted rounded-full animate-pulse" />
        <div className="h-5 w-16 bg-surface-muted rounded-full animate-pulse" />
        <div className="h-5 w-16 bg-surface-muted rounded-full animate-pulse" />
      </div>
    )
  }
  if (!amenities) return null
  const items: { label: string; icon: string; value: boolean | null }[] = [
    { label: 'USB', icon: '🔌', value: amenities.usb },
    { label: 'Wi-Fi', icon: '📶', value: amenities.wifi },
    { label: 'Klima', icon: '❄️', value: amenities.ac },
    { label: 'Engelli', icon: '♿', value: amenities.accessible },
  ]
  const known = items.filter((i) => i.value !== null)
  if (known.length === 0) return null
  return (
    <div className="px-4 pb-2 flex gap-3 justify-center flex-wrap">
      {known.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            item.value
              ? 'bg-emerald-900/50 text-emerald-400'
              : 'bg-surface-muted text-slate-600 line-through'
          }`}
        >
          {item.icon} {item.label}
        </span>
      ))}
    </div>
  )
}

export type BusDetailSheetProps = {
  routeCode: string | null
  destination: string | null
  plate: string | null
  kapino: string | null
  
  // Optional metrics (only passed if we have them, like on StopPage)
  etaMinutes?: number | null
  etaRaw?: string | null
  speedKmh?: number | null
  
  // Optional Map & Distance info
  showMap?: boolean
  busLat?: number | null
  busLon?: number | null
  stopLat?: number | null
  stopLon?: number | null

  // Amenities
  amenities?: Amenities | null
  
  // If provided, the sheet will dynamically fetch full bus details to populate amenities
  fetchAmenitiesForKapino?: string | null

  // Actions
  onClose: () => void
  showRouteButton?: boolean
}

export default function BusDetailSheet({
  routeCode,
  destination,
  plate,
  kapino,
  etaMinutes,
  etaRaw,
  speedKmh,
  showMap = true,
  busLat,
  busLon,
  stopLat,
  stopLon,
  amenities,
  fetchAmenitiesForKapino,
  onClose,
  showRouteButton = true,
}: BusDetailSheetProps) {
  const navigate = useNavigate()
  
  const [liveAmenities, setLiveAmenities] = useState<Amenities | null>(amenities || null)
  const [livePlate, setLivePlate] = useState<string | null>(plate || null)
  const [liveSpeed, setLiveSpeed] = useState<number | null>(speedKmh ?? null)
  const [liveDestination, setLiveDestination] = useState<string | null>(destination || null)
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false)

  // Fetch live amenities if requested
  useEffect(() => {
    // StopPage passes full amenities directly, RoutePage might not have them initially
    if (fetchAmenitiesForKapino) {
      setIsLoadingAmenities(true)
      api.fleet.detail(fetchAmenitiesForKapino)
        .then((data) => {
          if (data.plate) setLivePlate(data.plate)
          if (data.speed != null) setLiveSpeed(data.speed)
          if (data.direction) setLiveDestination(data.direction)
          
          if (data.has_usb !== undefined) {
            setLiveAmenities({
              usb: data.has_usb ?? null,
              wifi: data.has_wifi ?? null,
              ac: data.is_air_conditioned ?? null,
              accessible: data.accessible ?? null
            })
          }
        })
        .catch((err: unknown) => console.error('Failed to load amenities:', err))
        .finally(() => setIsLoadingAmenities(false))
    } else if (amenities) {
      setLiveAmenities(amenities)
    }
  }, [fetchAmenitiesForKapino, amenities])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const hasBusPos = busLat != null && busLon != null
  const hasStopPos = stopLat != null && stopLon != null

  const dist = (hasBusPos && hasStopPos) ? haversineM(busLat!, busLon!, stopLat!, stopLon!) : null
  const distLabel =
    dist !== null
      ? dist < 1000
        ? `${Math.round(dist)} m`
        : `${(dist / 1000).toFixed(1)} km`
      : null

  const mapCenter: [number, number] = hasBusPos && hasStopPos
    ? [(busLat! + stopLat!) / 2, (busLon! + stopLon!) / 2]
    : hasBusPos ? [busLat!, busLon!] : hasStopPos ? [stopLat!, stopLon!] : [41.0, 29.0]

  const bounds: [[number, number], [number, number]] | null = (hasBusPos && hasStopPos)
    ? [
        [Math.min(busLat!, stopLat!), Math.min(busLon!, stopLon!)],
        [Math.max(busLat!, stopLat!), Math.max(busLon!, stopLon!)],
      ]
    : null

  const busIcon = L.divIcon({
    className: '',
    html: `<div style="background:#f97316;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 0 0 3px rgba(249,115,22,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  const stopIcon = L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

  // Which metrics should we show?
  const showETA = etaMinutes !== undefined || etaRaw !== undefined
  const showDist = distLabel !== null

  return (
    <div className="fixed inset-0 z-[10000] flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl mx-auto bg-surface-card border-t border-surface-muted rounded-t-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div
            className="text-white font-mono font-bold text-sm rounded-xl px-3 py-1.5 shrink-0"
            style={{ backgroundColor: routeCode ? '#f97316' : '#6b7280' }}
          >
            {routeCode ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{liveDestination ?? 'Bilinmeyen Yön'}</p>
            {(livePlate || kapino) && (
              <p className="text-xs text-slate-400 font-mono">
                {[livePlate, kapino].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map — bus ↔ stop */}
        {showMap && (
          hasBusPos || hasStopPos ? (
            <div style={{ height: 200 }}>
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer
                  attribution='&copy; CartoDB'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {bounds && <FitBoundsEffect bounds={bounds} />}
                {hasBusPos && hasStopPos && (
                  <Polyline
                    positions={[[busLat!, busLon!], [stopLat!, stopLon!]]}
                    pathOptions={{ color: '#f97316', weight: 2, dashArray: '6 4', opacity: 0.7 }}
                  />
                )}
                {hasBusPos && <Marker position={[busLat!, busLon!]} icon={busIcon} />}
                {hasStopPos && <Marker position={[stopLat!, stopLon!]} icon={stopIcon} />}
              </MapContainer>
            </div>
          ) : (
            <div className="h-12 flex items-center justify-center">
              <p className="text-xs text-slate-500">Araç konumu henüz mevcut değil</p>
            </div>
          )
        )}

        {/* Info strip — horizontal flex container */}
        <div className="px-4 py-4 flex flex-row flex-wrap items-center justify-around gap-4 border-t border-surface-muted">
          {showETA && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">ETA</p>
              <p className="text-base font-mono font-bold text-slate-100">
                {etaMinutes !== null && etaMinutes !== undefined ? `${etaMinutes} dk` : (etaRaw ?? '—')}
              </p>
            </div>
          )}
          {showDist && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Mesafe</p>
              <p className="text-base font-mono font-bold text-slate-100">{distLabel ?? '—'}</p>
            </div>
          )}
          {liveSpeed != null && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Hız</p>
              <p className="text-base font-mono font-bold text-slate-100">{liveSpeed} km/h</p>
            </div>
          )}
          {livePlate != null && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Plaka</p>
              <p className="text-base font-bold text-slate-100 font-mono">{livePlate}</p>
            </div>
          )}
        </div>

        {/* Amenity icons */}
        <AmenityIcons amenities={liveAmenities} isLoading={isLoadingAmenities} />

        {/* CTA */}
        <div className="px-4 pb-6 pt-2">
          <div className={`grid gap-2 ${showRouteButton ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {showRouteButton && routeCode && (
              <Link
                to={`/routes/${routeCode}`}
                onClick={onClose}
                className="block w-full text-center bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Hattı Aç →
              </Link>
            )}
            
            <button
              onClick={() => {
                if (!kapino) return
                onClose()
                navigate(`/arac/bus/${encodeURIComponent(kapino)}`)
              }}
              disabled={!kapino}
              className={`w-full text-center border border-[#2a2a2a] text-[#00AFF0] font-semibold
                         py-3 rounded-xl text-sm transition-colors disabled:text-slate-600
                         disabled:border-[#1a1a1a] disabled:cursor-not-allowed hover:border-[#00AFF0]/60 ${
                           !showRouteButton ? 'bg-surface' : ''
                         }`}
            >
              Daha Fazla Detay
            </button>
          </div>

          {!kapino && (
            <p className="text-[11px] text-slate-600 mt-2 text-center">
              Bu kayıtta kapı kodu yok, araç detayı açılamıyor.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
