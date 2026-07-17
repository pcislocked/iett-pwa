import { useState, useRef, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type TFunction } from 'i18next'

import { api, type BusDetail, type BusPosition, type NearbyStop } from '@/api/client'
import { useFleet } from '@/hooks/useFleet'
import { useLocationManager } from '@/hooks/useLocationManager'

import CanvasFleetLayer from '@/components/CanvasFleetLayer'
import MapSearchPanel from '@/components/MapSearchPanel'
import MapTileToggle, { TILES } from '@/components/MapTileToggle'
import MapBusPicker from '@/components/MapBusPicker'

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  const hasTimezone = /(?:[zZ]|[+\-]\d{2}:\d{2})$/.test(trimmed)
  const parsed = new Date(hasTimezone ? trimmed : `${trimmed}Z`)
  if (Number.isNaN(parsed.getTime()) && !hasTimezone) {
    const fallback = new Date(trimmed)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatAgo(from: Date | null, nowMs: number, t: TFunction): string {
  if (!from) return '—'
  const diffSeconds = Math.max(0, Math.floor((nowMs - from.getTime()) / 1000))
  if (diffSeconds < 60) return t('map.secondsAgo', { defaultValue: '{{seconds}} sn önce', seconds: diffSeconds })
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return t('map.minutesAgo', { defaultValue: '{{minutes}} dk önce', minutes: diffMinutes })
  const diffHours = Math.floor(diffMinutes / 60)
  return t('map.hoursAgo', { defaultValue: '{{hours}} sa önce', hours: diffHours })
}

// ── GPS Button ────────────────────────────────────────────────────────────────
function GpsButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={t('map.findMe', { defaultValue: 'Konumumu Bul' })}
      className="w-10 h-10 bg-surface-card/90 backdrop-blur 
                 rounded-xl shadow-lg border border-surface-muted flex items-center justify-center
                 text-brand-500 hover:text-brand-400 active:scale-95 disabled:opacity-50 transition-all"
    >
      <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {loading ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v10.652a1 1 0 01-1.447.894L15 18M9 10l-4.553 2.276A1 1 0 003 13.171v10.652a1 1 0 001.447.894L9 22m6-12v12m-6-12v12" />
        )}
      </svg>
    </button>
  )
}

function GpsMarker({ location }: { location: [number, number] | null }) {
  const map = useMap()
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
        <div className="text-sm font-bold">Konumunuz</div>
      </Popup>
    </CircleMarker>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mapRef = useRef<L.Map | null>(null)

  // State
  const [tileIdx, setTileIdx] = useState(() => {
    const saved = localStorage.getItem('map-tile')
    return saved ? Number(saved) : 0
  })
  
  const [fleetVisible, setFleetVisible] = useState(false)
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [selectedStops, setSelectedStops] = useState<{ dcode: string; name: string }[]>([])
  
  const [selectedKapino, setSelectedKapino] = useState<string | null>(null)
  const [pickerBuses, setPickerBuses] = useState<BusPosition[] | null>(null)
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([])
  const [stopPins, setStopPins] = useState<Record<string, { lat: number; lon: number }>>({})

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

  // Selected Bus Detail Fetch
  const [selectedDetail, setSelectedDetail] = useState<BusDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5000)
    return () => window.clearInterval(id)
  }, [])

  // Fetch Bus detail when kapino selected
  useEffect(() => {
    if (!selectedKapino) {
      setSelectedDetail(null)
      return
    }
    let alive = true
    setDetailLoading(true)
    api.fleet.detail(selectedKapino)
      .then(res => {
        if (alive) {
          setSelectedDetail(res)
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
    if (!selectedDetail) return position ? { ...position, plate: undefined, resolved_route_code: position.route_code, route_is_live: false } : null
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
        style={{ flex: 1, width: '100%', touchAction: 'none' }}
        zoomControl={false}
      >
        <TileLayer key={TILES[tileIdx].key} url={TILES[tileIdx].url} />

        {/* User GPS Location */}
        <GpsMarker location={location} />

        {/* Selected Stops */}
        {selectedStops.map(s => {
          const pin = stopPins[s.dcode]
          if (!pin) return null
          return (
            <CircleMarker key={`sel-${s.dcode}`} center={[pin.lat, pin.lon]} radius={10} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}>
              <Popup>
                <div className="text-sm font-bold mb-1">{s.name}</div>
                <div className="text-[10px] text-text-muted">#{s.dcode}</div>
                <button onClick={() => navigate(`/stops/${s.dcode}`)} className="text-brand-400 text-xs mt-2 font-bold">{t('map.arrivalTimes', 'Varış Saatleri')} &rarr;</button>
              </Popup>
            </CircleMarker>
          )
        })}

        {/* Nearby Stops */}
        {nearbyStops.map(s => (
          <CircleMarker key={`near-${s.stop_code}`} center={[s.latitude, s.longitude]} radius={6} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.7, weight: 1.5 }}>
            <Popup>
              <div className="text-sm font-bold mb-1">{s.stop_name}</div>
              <div className="text-[10px] text-text-muted">#{s.stop_code} · {s.distance_m}m</div>
              <button onClick={() => navigate(`/stops/${s.stop_code}`)} className="text-brand-400 text-xs mt-2 font-bold">{t('map.arrivalTimes', 'Varış Saatleri')} &rarr;</button>
            </Popup>
          </CircleMarker>
        ))}

        {/* Buses */}
        {displayBuses.length > 0 && (
          <CanvasFleetLayer
            buses={displayBuses}
            selectedRoutes={selectedRoutes}
            selectedKapino={selectedKapino}
            onBusClick={setSelectedKapino}
            onMultiBusClick={setPickerBuses}
          />
        )}
      </MapContainer>

      {/* ── Bottom Controls Overlay ── */}
      {selectedKapino && (
        <div className="absolute bottom-0 left-0 right-0 z-[1001] pointer-events-none flex justify-center">
          <div className="pointer-events-auto w-full max-w-2xl bg-surface-card border-t border-surface-border rounded-t-2xl shadow-2xl overflow-hidden pb-4">
            
            {/* Drag Handle (Visual) */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-slate-600/80" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2">
              <div
                className="text-white font-mono font-bold text-sm rounded-xl px-3 py-1.5 shrink-0"
                style={{ backgroundColor: mergedDetail?.route_is_live ? 'var(--color-warning)' : 'var(--color-text-3)' }}
              >
                {mergedDetail?.resolved_route_code || '...'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {mergedDetail?.direction ? `\u2192 ${mergedDetail.direction}` : t('map.noDirectionInfo', 'Yön Bilgisi Yok')}
                  </p>
                  {detailLoading && <span className="text-[10px] text-brand-500 animate-pulse">{t('common.loading', 'yükleniyor...')}</span>}
                </div>
                <p className="text-xs text-text-secondary font-mono">
                  {selectedKapino} {mergedDetail?.plate ? ` \u00b7 ${mergedDetail.plate}` : ''}
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
                  {mergedDetail?.speed ?? '—'} <span className="text-xs font-normal">km/h</span>
                </p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Plaka</p>
                <p className="text-sm font-bold text-text-primary font-mono mt-0.5">{mergedDetail?.plate ?? '—'}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('arac.lastSeen', 'Son Görülme')}</p>
                <p className="text-sm font-bold text-text-primary mt-0.5">
                  {mergedDetail?.last_seen ? formatAgo(parseIsoDate(mergedDetail.last_seen), nowMs, t) : '—'}
                </p>
              </div>
            </div>

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

      {/* ── Multi-Bus Picker ── */}
      {pickerBuses && (
        <MapBusPicker 
          buses={pickerBuses} 
          onSelect={setSelectedKapino} 
          onClose={() => setPickerBuses(null)} 
        />
      )}

      {/* ── Bottom Controls Overlay ── */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        {/* Floating Controls Row (GPS & Tile Toggle) */}
        <div className="flex justify-between items-end w-full">
          <div className="pointer-events-auto">
            <GpsButton onClick={handleGpsClick} loading={gpsLoading} />
          </div>
          <div className="pointer-events-auto">
            <MapTileToggle 
              tileIdx={tileIdx} 
              onCycle={() => {
                const next = (tileIdx + 1) % TILES.length
                setTileIdx(next)
                localStorage.setItem('map-tile', String(next))
              }} 
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
