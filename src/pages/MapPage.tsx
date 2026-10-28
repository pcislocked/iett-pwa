import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker, useMapEvents } from 'react-leaflet'
import * as L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'


import { api, type BusDetail, type BusPosition, type NearbyStop, type RouteMetadata } from '@/api/client'
import { useFleet } from '@/hooks/useFleet'
import { useLocationManager } from '@/hooks/useLocationManager'

import CanvasFleetLayer from '@/components/CanvasFleetLayer'
import MapSearchPanel from '@/components/MapSearchPanel'
import MapTileToggle from '@/components/MapTileToggle'
import { ISTANBUL_BOUNDS, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from '@/utils/mapConstants'
import MapStopCard from '@/components/MapStopCard'
import MapEntityPicker from '@/components/MapEntityPicker'
import { formatGpsTimestamp } from '@/utils/dateUtils'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { useMapTiles } from '@/hooks/useMapTiles'
import { formatPlate } from '@/utils/plateUtils'
import { formatBusDirectionLabel } from '@/utils/busDirectionLabel'

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Format: "HH:mm:ss" or "HH:mm"
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (timeMatch) {
    const d = new Date()
    d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), parseInt(timeMatch[3] || '0', 10), 0)
    return d
  }

  // Format: "DD-MM-YYYY HH:mm:ss" or "DD.MM.YYYY HH:mm:ss"
  const dmyMatch = trimmed.match(/^(\d{2})[\.\-](\d{2})[\.\-](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (dmyMatch) {
    const [, day, month, year, hh, mm, ss] = dmyMatch
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hh || '0', 10), parseInt(mm || '0', 10), parseInt(ss || '0', 10))
  }

  // Standard date format parsing without appending 'Z'
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// ── GPS Button ────────────────────────────────────────────────────────────────
function GpsButton({ onClick, loading, consent }: { onClick: () => void; loading: boolean; consent: 'pending' | 'granted' | 'denied' }) {
  const { t } = useTranslation()

  // If consent is denied, we can make it red or slashed, but for now we'll just style it differently.
  const isDenied = consent === 'denied'
  const colorClass = isDenied ? 'text-red-500 hover:text-red-400' : 'text-brand-500 hover:text-brand-400'

  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={t('map.findMe', { defaultValue: 'Konumumu Bul' })}
      className={`w-10 h-10 bg-surface-card/90 backdrop-blur
                 rounded-xl shadow-lg border border-surface-muted flex items-center justify-center
                 ${colorClass} active:scale-95 disabled:opacity-50 transition-all`}
    >
      <svg className={`w-6 h-6 ${loading ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {loading ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            {isDenied && (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" stroke="currentColor" strokeWidth={2.5} className="text-red-500 opacity-80" />
            )}
          </>
        )}
      </svg>
    </button>
  )
}

function GpsMarker({ location }: { location: [number, number] | null }) {
  const map = useMap()
  const { t } = useTranslation()
  useEffect(() => {
    if (location) map.flyTo(location, 15, { duration: 1.5 })
  }, [location, map])

  if (!location) return null
  return (
    <CircleMarker
      center={location}
      radius={8}
      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, weight: 2 }}
    >
      <Popup>
        <div className="text-sm font-bold">{t('map.yourLocation', { defaultValue: 'Konumunuz' })}</div>
      </Popup>
    </CircleMarker>
  )
}

function MapViewportTracker({ onUpdate }: { onUpdate: (zoom: number, center: L.LatLng) => void }) {
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])
  const map = useMapEvents({
    zoomend: () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => onUpdate(map.getZoom(), map.getCenter()), 100)
    },
    moveend: () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => onUpdate(map.getZoom(), map.getCenter()), 100)
    },
  })
  return null
}

function MapClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
  })
  return null
}

// ── Main Page ────────────────────────────────────────────────────────────────
interface AmenityItem {
  label: string
  icon: string
  value: boolean | null | undefined
  textOverride?: string | null
}

function AmenityIcons({ bus }: { bus: Partial<BusPosition> | null | undefined }) {
  const { t } = useTranslation()
  const items: AmenityItem[] = [
    { label: t('amenities.usb', 'USB'), icon: '🔌', value: bus?.has_usb },
    { label: t('amenities.wifi', 'Wİ-Fİ'), icon: '🛜', value: bus?.has_wifi },
    { label: t('amenities.ac', 'KLİMA'), icon: '❄️', value: bus?.is_air_conditioned },
    { label: t('amenities.accessible', 'ERİŞİLEBİLİR'), icon: '♿', value: bus?.accessible },
    { label: t('amenities.capacity', 'KAPASİTE'), icon: '👥', value: bus?.full_capacity ? true : null, textOverride: bus?.full_capacity ? t('amenities.capacityCount', { count: bus.full_capacity, defaultValue: '{{count}} Kişi' }) : null },
  ]
  const known = items.filter((i) => i.value != null)
  if (known.length === 0) return null
  return (
    <div className="px-4 py-3 flex gap-3 justify-center flex-wrap border-t border-surface-muted bg-surface-muted/10">
      {known.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            item.value
              ? 'bg-emerald-900/50 text-emerald-400'
              : 'bg-surface-muted text-text-muted line-through'
          }`}
        >
          {item.icon} {item.textOverride || item.label}
        </span>
      ))}
    </div>
  )
}

const pulseIcon = L.divIcon({
  className: 'relative',
  html: '<div class="w-8 h-8 bg-emerald-500/40 rounded-full animate-ping border border-emerald-400/50"></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const pulseStopIcon = L.divIcon({
  className: 'relative',
  html: '<div class="w-8 h-8 bg-sky-500/40 rounded-full animate-ping border border-sky-400/50"></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-sky-500 rounded-full border-2 border-white shadow-lg"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

export default function MapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mapRef = useRef<L.Map | null>(null)
  const { currentUrl, currentAttribution, satellite, toggleSatellite, mapClassName, tileClassName } = useMapTiles()
  
  const { prefs } = useUserPrefs()

  // State

  const [fleetVisible, setFleetVisible] = useState(true)
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [selectedStops, setSelectedStops] = useState<{ dcode: string; name: string }[]>([])

  const [selectedKapino, setSelectedKapino] = useState<string | null>(null)
  const [selectedStop, setSelectedStop] = useState<NearbyStop | null>(null)
  const [pickerEntities, setPickerEntities] = useState<{ buses: BusPosition[]; stops: NearbyStop[] } | null>(null)
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([])
  const [stopPins, setStopPins] = useState<Record<string, { lat: number; lon: number }>>({})
  const [mapZoom, setMapZoom] = useState(11)
  const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null)
  const [lastSearchedCenter, setLastSearchedCenter] = useState<{ lat: number; lon: number } | null>(null)
  const [areaStops, setAreaStops] = useState<NearbyStop[]>([])
  const [areaStopsLoading, setAreaStopsLoading] = useState(false)
  const areaAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      areaAbortRef.current?.abort()
    }
  }, [])

  const handleSearchAreaStops = useCallback(async () => {
    const map = mapRef.current
    if (!map || mapZoom < 14 || areaStopsLoading) return
    areaAbortRef.current?.abort()
    const controller = new AbortController()
    areaAbortRef.current = controller

    setAreaStopsLoading(true)
    try {
      const center = map.getCenter()
      const bounds = map.getBounds()
      const viewportRadius = Math.round(center.distanceTo(bounds.getNorthEast()))
      const radius = Math.min(2500, Math.max(400, viewportRadius))
      const stops = await api.stops.nearby(center.lat, center.lng, 1000, radius, { signal: controller.signal })
      if (!controller.signal.aborted) {
        setAreaStops(stops)
        setLastSearchedCenter({ lat: center.lat, lon: center.lng })
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Failed to fetch area stops', err)
    } finally {
      if (!controller.signal.aborted) {
        setAreaStopsLoading(false)
      }
    }
  }, [mapZoom, areaStopsLoading])

  const distanceFromLastSearchM = useMemo(() => {
    if (!lastSearchedCenter || !mapCenter) return Infinity
    return mapCenter.distanceTo([lastSearchedCenter.lat, lastSearchedCenter.lon])
  }, [lastSearchedCenter, mapCenter])

  const showAsListMode = lastSearchedCenter !== null && areaStops.length > 0 && distanceFromLastSearchM <= 10

  // Fetch Fleet (Lazy)
  const { data: fleet, error: fleetError } = useFleet({ enabled: fleetVisible })

  // Fetch Route Buses (manual refetch loop for selected routes)
  const [routeBusMap, setRouteBusMap] = useState<Map<string, BusPosition[]>>(new Map())

  useEffect(() => {
    if (selectedRoutes.length === 0) return
    let isMounted = true
    const controller = new AbortController()
    let requestSeq = 0
    const lastAppliedSeq = new Map<string, number>()

    const fetchBuses = () => {
      if (!isMounted) return
      const currentSeq = ++requestSeq

      for (const route of selectedRoutes) {
        api.routes.buses(route, { signal: controller.signal })
          .then(bs => {
            if (!isMounted) return
            const applied = lastAppliedSeq.get(route) || 0
            if (currentSeq > applied) {
              lastAppliedSeq.set(route, currentSeq)
              setRouteBusMap(prev => new Map(prev).set(route, bs))
            }
          })
          .catch(() => {})
      }
    }

    fetchBuses()
    const interval = setInterval(fetchBuses, 15_000)

    return () => {
      isMounted = false
      clearInterval(interval)
      controller.abort()
    }
  }, [selectedRoutes])

  // Clear unselected routes from map
  useEffect(() => {
    setRouteBusMap(prev => {
      const next = new Map(prev)
      for (const key of next.keys()) {
        if (!selectedRoutes.includes(key)) next.delete(key)
      }
      return next
    })
  }, [selectedRoutes])

  // Stop pin fetching
  useEffect(() => {
    selectedStops.forEach(s => {
      if (!stopPins[s.dcode]) {
        api.stops.detail(s.dcode).then(res => {
          if (res.latitude && res.longitude) {
            setStopPins(prev => ({ ...prev, [s.dcode]: { lat: res.latitude!, lon: res.longitude! } }))
          }
        }).catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStops])

  // Location Manager for GPS Button
  const { location, loading: gpsLoading, requestLocation } = useLocationManager()

  // Compute Display Buses
  const displayBuses = useMemo(() => {
    const map = new Map<string, BusPosition>()
    if (fleetVisible && fleet) {
      for (const b of fleet) map.set(b.kapino, b)
    }
    for (const buses of routeBusMap.values()) {
      for (const b of buses) {
        const existing = map.get(b.kapino)
        if (!existing || (parseIsoDate(b.last_seen)?.getTime() ?? 0) > (parseIsoDate(existing.last_seen)?.getTime() ?? 0)) {
          map.set(b.kapino, b)
        }
      }
    }
    return Array.from(map.values())
  }, [fleet, fleetVisible, routeBusMap])

  // Unified stops combining nearbyStops, areaStops, and selectedStops
  const unifiedStops = useMemo<NearbyStop[]>(() => {
    const stopMap = new Map<string, NearbyStop>()
    for (const s of nearbyStops) stopMap.set(s.stop_code, s)
    for (const s of areaStops) stopMap.set(s.stop_code, s)
    for (const s of selectedStops) {
      const pin = stopPins[s.dcode]
      if (pin && !stopMap.has(s.dcode)) {
        stopMap.set(s.dcode, {
          stop_code: s.dcode,
          stop_name: s.name,
          latitude: pin.lat,
          longitude: pin.lon,
          direction: null,
          district: null,
          distance_m: 0,
        })
      }
    }
    return Array.from(stopMap.values())
  }, [nearbyStops, areaStops, selectedStops, stopPins])

  // Unified Hit-Test Callback for 24px Radius Touch Conflicts
  const handleEntityHit = useCallback((result: { buses: BusPosition[]; stops: NearbyStop[] }) => {
    const total = result.buses.length + result.stops.length
    if (total === 0) {
      setSelectedKapino(null)
      setSelectedStop(null)
      setPickerEntities(null)
    } else if (result.stops.length === 1 && result.buses.length === 0) {
      setSelectedKapino(null)
      setPickerEntities(null)
      setSelectedStop(result.stops[0])
    } else if (result.buses.length === 1 && result.stops.length === 0) {
      setSelectedStop(null)
      setPickerEntities(null)
      setSelectedKapino(result.buses[0].kapino)
    } else {
      setSelectedKapino(null)
      setSelectedStop(null)
      setPickerEntities(result)
    }
  }, [])

  const handleMapClick = useCallback((latlng: L.LatLng) => {
    if (!mapRef.current) return
    const clickPt = mapRef.current.latLngToContainerPoint(latlng)
    const nearbyBuses = displayBuses.filter(b => {
      if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return false
      const pt = mapRef.current!.latLngToContainerPoint([b.latitude, b.longitude])
      return clickPt.distanceTo(pt) <= 24
    })
    const nearbyS = unifiedStops.filter(st => {
      if (!Number.isFinite(st.latitude) || !Number.isFinite(st.longitude)) return false
      const pt = mapRef.current!.latLngToContainerPoint([st.latitude, st.longitude])
      return clickPt.distanceTo(pt) <= 24
    })
    handleEntityHit({ buses: nearbyBuses, stops: nearbyS })
  }, [displayBuses, unifiedStops, handleEntityHit])

  // Selected Bus Detail Fetch
  const [selectedDetail, setSelectedDetail] = useState<BusDetail | null>(null)
  const [selectedRouteMeta, setSelectedRouteMeta] = useState<RouteMetadata[] | null>(null)
  const [selectedFirstStop, setSelectedFirstStop] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Fetch Bus detail when kapino selected
  useEffect(() => {
    setSelectedDetail(null)
    setSelectedRouteMeta(null)
    setSelectedFirstStop(null)
    if (!selectedKapino) {
      return
    }
    let alive = true
    setDetailLoading(true)
    api.fleet.detail(selectedKapino)
      .then(async (res) => {
        if (!alive) return
        let enriched = { ...res }
        let activeFirstStop: string | null = null
        try {
          const aracData = await api.arac.autoDetail(selectedKapino)
          if (aracData && aracData.profile) {
            enriched = { ...enriched, ...aracData.profile }
            if (aracData.missions?.missions?.length > 0) {
              const activeMission =
                aracData.missions.missions.find(m => m.state === 'B') ??
                aracData.missions.missions[0]
              if (!enriched.resolved_route_code && activeMission.line_code) {
                enriched.resolved_route_code = activeMission.line_code
              }
              activeFirstStop = activeMission.first_stop || null
              if (!enriched.direction && activeMission.first_stop) {
                enriched.direction = activeMission.first_stop
              }
            }
          }
        } catch(e) { console.error(e) }

        let routeMeta: RouteMetadata[] | null = null
        if (enriched.resolved_route_code) {
          try {
            routeMeta = await api.routes.metadata(enriched.resolved_route_code)
          } catch {
            routeMeta = null
          }
        }
        
        if (alive) {
          setSelectedDetail(enriched as unknown as BusDetail)
          setSelectedFirstStop(activeFirstStop)
          setSelectedRouteMeta(routeMeta)
          setDetailLoading(false)
          if (res.latitude && res.longitude) {
            mapRef.current?.flyTo([res.latitude, res.longitude], 15, { duration: 0.5 })
          }
        }
      })
      .catch(() => {
        if (alive) setDetailLoading(false)
      })
    return () => { alive = false }
  }, [selectedKapino])

  const handleGpsClick = () => {
    requestLocation?.()
    if (location) {
      api.stops.nearby(location[0], location[1], 15, 500)
        .then(setNearbyStops)
        .catch(() => {})
    }
  }

  // Effect to handle GPS nearby fetch once location is acquired
  useEffect(() => {
    if (location && nearbyStops.length === 0) {
      api.stops.nearby(location[0], location[1], 15, 500)
        .then(setNearbyStops)
        .catch(() => {})
    }
  }, [location, nearbyStops.length])

  const mergedDetail = useMemo(() => {
    const position = displayBuses.find(b => b.kapino === selectedKapino)
    if (!selectedDetail) return position ? { ...position, plate: undefined, resolved_route_code: position.route_code, route_is_live: false, route_stops: [] } : null
    return { ...position, ...selectedDetail }
  }, [selectedDetail, selectedKapino, displayBuses])

  return (
    <div className="relative flex flex-col overflow-hidden h-full bg-[#1e1e1e]">

      {/* ── IBB Error Modal ── */}
      {fleetError && fleetVisible && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-red-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
            <h2 className="text-xl font-bold text-red-400 mb-3">{t('map.errorTitle', { defaultValue: 'İBB Tarafından Engellendi 🛑' })}</h2>
            <p className="text-text-secondary text-sm mb-4 leading-relaxed text-left">
              {t('map.ibbNotice', 'İBB Yönetimi, halkın vergileriyle çalışan otobüslerin global konum verilerini halka kapattığı için tüm filoyu şu an çekemiyoruz. Arama çubuğundan belirli bir hat aratarak (ör: 500T) o hattın araçlarını sorunsuzca görmeye devam edebilirsiniz.')}
            </p>
            <button
              onClick={() => setFleetVisible(false)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-5 py-2 rounded-lg font-medium transition-colors"
            >
              {t('common.gotIt', 'Anladım')}
            </button>
          </div>
        </div>
      )}

      {/* ── Map ── */}
      <MapContainer
        ref={mapRef}
        center={[41.015, 28.98]}
        zoom={11}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={ISTANBUL_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ flex: 1, width: '100%', touchAction: 'none' }}
        zoomControl={false}
        className={mapClassName}
      >
        <TileLayer
          key={currentUrl}
          className={tileClassName}
          url={currentUrl}
          attribution={currentAttribution}
          keepBuffer={2}
          updateWhenIdle={true}
          updateWhenZooming={false}
        />

        {/* Viewport Tracker & Map Click Handler */}
        <MapViewportTracker onUpdate={(zoom, center) => { setMapZoom(zoom); setMapCenter(center) }} />
        <MapClickHandler onClick={handleMapClick} />

        {/* User GPS Location */}
        <GpsMarker location={location} />

        {/* Unified Stop Markers (24px Unified Hit-Test, No Popups) */}
        {unifiedStops.map(s => {
          const isSelected = selectedStop?.stop_code === s.stop_code
          return (
            <CircleMarker
              key={`stop-${s.stop_code}`}
              center={[s.latitude, s.longitude]}
              radius={isSelected ? 9 : (mapZoom >= 15 ? 7 : 6)}
              pathOptions={{
                color: isSelected ? '#38bdf8' : '#ffffff',
                fillColor: isSelected ? '#0284c7' : '#ef4444',
                fillOpacity: 0.95,
                weight: isSelected ? 3 : 2.5,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e)
                  handleMapClick(e.latlng)
                }
              }}
            />
          )
        })}

        {/* Selected Stop Pulse Overlay */}
        {selectedStop && Number.isFinite(selectedStop.latitude) && Number.isFinite(selectedStop.longitude) && (
          <Marker position={[selectedStop.latitude, selectedStop.longitude]} icon={pulseStopIcon} zIndexOffset={999} />
        )}

        {/* Buses */}
        {displayBuses.length > 0 && (
          <CanvasFleetLayer
            buses={displayBuses}
            stops={unifiedStops}
            selectedRoutes={selectedRoutes}
            selectedKapino={selectedKapino}
            onBusClick={(kapino) => {
              setSelectedStop(null)
              setSelectedKapino(kapino)
            }}
            onMultiBusClick={(bs) => {
              setSelectedStop(null)
              setSelectedKapino(null)
              setPickerEntities({ buses: bs, stops: [] })
            }}
            onEntityHit={handleEntityHit}
          />
        )}

        {/* Selected Bus Pulse Overlay */}
        {selectedKapino && mergedDetail?.latitude && mergedDetail?.longitude && (
          <Marker position={[mergedDetail.latitude, mergedDetail.longitude]} icon={pulseIcon} zIndexOffset={1000} />
        )}
      </MapContainer>

      {/* ── 🚕 Bottom Controls Overlay ── */}
      {selectedKapino && (
        <div className="absolute bottom-[160px] left-0 right-0 z-[1001] pointer-events-none flex justify-center pb-2 px-2">
          <div className="pointer-events-auto w-full max-w-2xl bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden pb-3">

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="text-white font-mono font-bold text-sm rounded-xl px-3 py-1.5 shrink-0"
                style={{ backgroundColor: mergedDetail?.resolved_route_code ? 'var(--color-warning)' : 'var(--color-text-3)' }}
              >
                {mergedDetail?.resolved_route_code || '...'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {formatBusDirectionLabel(
                      {
                        direction: mergedDetail?.direction,
                        direction_letter: mergedDetail?.direction_letter,
                        route_name: mergedDetail?.route_name,
                        first_stop: selectedFirstStop,
                        metadata: selectedRouteMeta,
                        route_stops: mergedDetail?.route_stops,
                      },
                      t('map.noDirectionInfo', 'Yön Bilgisi Yok'),
                    )}
                  </p>
                  {detailLoading && <span className="text-[10px] text-brand-500 animate-pulse">{t('common.loading', 'yükleniyor...')}</span>}
                </div>
                <p className="text-xs text-text-secondary font-mono">
                  {selectedKapino} {mergedDetail?.plate ? ` \u00b7 ${formatPlate(mergedDetail.plate)}` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedKapino(null)} className="p-1.5 text-text-muted hover:text-text-secondary shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info Strip */}
            <div className="px-4 py-3 grid grid-cols-3 gap-2 border-t border-surface-muted mt-2">
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('map.speed', 'Hız')}</p>
                <p className="text-base font-bold text-text-primary">
                  {mergedDetail?.speed ?? '?'} <span className="text-xs font-normal">km/h</span>
                </p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('map.plate', { defaultValue: 'Plaka' })}</p>
                <p className="text-sm font-bold text-text-primary font-mono mt-0.5">{formatPlate(mergedDetail?.plate) ?? '?'}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('arac.lastSeen', 'Son Görülme')}</p>
                <p className="text-sm font-bold text-text-primary mt-0.5">
                  {mergedDetail?.last_seen ? formatGpsTimestamp(mergedDetail.last_seen, prefs.timestampMode, t) : '-'}
                </p>
              </div>
            </div>

            {/* Amenity Icons (Air Conditioning, etc.) */}
            <AmenityIcons bus={mergedDetail} />

            {/* CTA Buttons */}
            <div className="px-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (mergedDetail?.resolved_route_code) {
                      navigate(`/routes/${mergedDetail.resolved_route_code}`)
                    }
                  }}
                  disabled={!mergedDetail?.resolved_route_code}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('map.openRoute', 'Hattı Aç')} &rarr;
                </button>
                <button
                  onClick={() => navigate(`/arac/bus/${encodeURIComponent(selectedKapino)}`)}
                  className="w-full border border-surface-border text-brand-primary font-semibold py-3 rounded-xl text-sm transition-colors hover:border-brand-primary/60"
                >
                  {t('stops.moreDetail', 'Daha Fazla Detay')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Stop Detail Card (Variation A) ── */}
      {selectedStop && (
        <MapStopCard
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          onOpenStop={(code) => navigate(`/stops/${code}`)}
        />
      )}

      {/* ── Multi-Entity Picker (Buses & Stops - Variation 2) ── */}
      {pickerEntities && (
        <MapEntityPicker
          buses={pickerEntities.buses}
          stops={pickerEntities.stops}
          onSelectBus={(kapino) => {
            setPickerEntities(null)
            setSelectedStop(null)
            setSelectedKapino(kapino)
          }}
          onSelectStop={(stop) => {
            setPickerEntities(null)
            setSelectedKapino(null)
            setSelectedStop(stop)
          }}
          onClose={() => setPickerEntities(null)}
        />
      )}

      {/* ── Bottom Controls Overlay ── */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        {/* Floating Controls Row (GPS, Center Action Button, & Tile Toggle) */}
        <div className="flex justify-between items-center w-full gap-2">
          <div className="pointer-events-auto shrink-0">
            <GpsButton onClick={handleGpsClick} loading={gpsLoading} consent={prefs.gpsConsent} />
          </div>

          {/* ── Area Stop Search / List Button in Bottom Center ── */}
          <div className="pointer-events-auto flex items-center justify-center gap-1.5 min-w-0">
            {mapZoom < 14 ? (
              <div
                role="status"
                className="opacity-80 bg-surface-card/95 backdrop-blur text-text-muted border border-surface-border cursor-not-allowed px-3 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-1.5 select-none"
              >
                <span>🔍</span>
                <span className="truncate">{t('map.zoomInToSearchStops', 'Durakları görmek için yakınlaşın')}</span>
              </div>
            ) : showAsListMode ? (
              <button
                onClick={() => {
                  if (lastSearchedCenter) {
                    navigate(`/nearby?lat=${lastSearchedCenter.lat}&lon=${lastSearchedCenter.lon}`)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2 rounded-full text-xs font-bold shadow-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📋</span>
                <span className="truncate">{t('map.showAsList', 'Liste Olarak Göster')}</span>
              </button>
            ) : (
              <button
                onClick={handleSearchAreaStops}
                disabled={areaStopsLoading}
                className="bg-brand-600 hover:bg-brand-500 active:scale-95 text-white px-3.5 py-2 rounded-full text-xs font-semibold shadow-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {areaStopsLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="truncate">{t('map.searchingStops', 'Duraklar aranıyor...')}</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span className="truncate">{t('map.searchStopsHere', 'Bu Bölgedeki Durakları Ara')}</span>
                  </>
                )}
              </button>
            )}

            {areaStops.length > 0 && (
              <button
                onClick={() => {
                  setAreaStops([])
                  setLastSearchedCenter(null)
                }}
                title={t('map.clearAreaStops', 'Bölge duraklarını temizle')}
                aria-label={t('map.clearAreaStops', 'Bölge duraklarını temizle')}
                className="bg-surface-card hover:bg-surface-muted active:scale-90 text-text-secondary w-8 h-8 rounded-full border border-surface-border shadow-lg flex items-center justify-center text-sm font-bold transition-all cursor-pointer shrink-0"
              >
                &times;
              </button>
            )}
          </div>

          <div className="pointer-events-auto shrink-0">
            <MapTileToggle
              satellite={satellite}
              onToggle={toggleSatellite}
            />
          </div>
        </div>

        {/* ── Search Panel (Bottom) ── */}
        <MapSearchPanel
          selectedRoutes={selectedRoutes}
          selectedStops={selectedStops}
          fleetVisible={fleetVisible}
          busCount={displayBuses.length}
          fleet={fleet}
          onAddRoute={(r) => !selectedRoutes.includes(r) && selectedRoutes.length < 5 && setSelectedRoutes([...selectedRoutes, r])}
          onRemoveRoute={(r) => setSelectedRoutes(selectedRoutes.filter(x => x !== r))}
          onAddStop={(d, n) => {
            if (!selectedStops.find(x => x.dcode === d)) {
              setSelectedStops([...selectedStops, { dcode: d, name: n }])
              api.stops.detail(d).then(res => {
                if (res.latitude && res.longitude) {
                  setStopPins(prev => ({ ...prev, [d]: { lat: res.latitude!, lon: res.longitude! } }))
                  mapRef.current?.flyTo([res.latitude, res.longitude], 15, { duration: 0.5 })
                }
              }).catch(() => {})
            } else {
              const pin = stopPins[d]
              if (pin) mapRef.current?.flyTo([pin.lat, pin.lon], 15, { duration: 0.5 })
            }
          }}
          onRemoveStop={(d) => setSelectedStops(selectedStops.filter(x => x.dcode !== d))}
          onToggleFleet={() => setFleetVisible(!fleetVisible)}
          onBusSearch={(k) => setSelectedKapino(k)}
        />
      </div>

    </div>
  )
}
