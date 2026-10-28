import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { ISTANBUL_BOUNDS, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from '@/utils/mapConstants'
import * as L from 'leaflet'
import { api, type NearbyStop as ApiNearbyStop } from '@/api/client'
import { distanceLabel } from '@/utils/distance'
import { useTranslation } from 'react-i18next'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { useLocationManager } from '@/hooks/useLocationManager'

import { useMapTiles } from '@/hooks/useMapTiles'
import MapTileToggle from '@/components/MapTileToggle'
import PullToRefresh from '@/components/PullToRefresh'

interface NearbyStop extends ApiNearbyStop {
  routes: string[]
}

type Phase = 'idle' | 'loading' | 'done' | 'error'

// ─── Map panner — pans to a coordinate when it changes ────────────────────────
function MapPanner({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([lat, lon], { animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, duration: 0.2 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])
  return null
}

// ─── Split nearby map component ───────────────────────────────────────────────
function NearbyMapView({
  stops,
  userLat,
  userLon,
  selectedCode,
  onSelect,
}: {
  stops: NearbyStop[]
  userLat: number
  userLon: number
  selectedCode: string | null
  onSelect: (code: string) => void
}) {
  const { t } = useTranslation()
  
  const { currentUrl, currentAttribution, satellite, toggleSatellite, mapClassName, tileClassName } = useMapTiles()
  const userIcon = L.divIcon({
    className: '',
    html: `<div style="
      background:#2563eb;border-radius:50%;
      width:18px;height:18px;
      border:3px solid #fff;
      box-shadow:0 0 0 4px rgba(37,99,235,0.35)">
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

  const selectedStop = stops.find((s) => s.stop_code === selectedCode) ?? null

  return (
    <MapContainer
      center={[userLat, userLon]}
      zoom={15}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      maxBounds={ISTANBUL_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%' }}
      className={mapClassName}
    >
        <TileLayer
          key={currentUrl}
          className={tileClassName}
          attribution={currentAttribution}
          url={currentUrl}
          keepBuffer={2}
          updateWhenIdle={true}
          updateWhenZooming={false}
        />
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
          <MapTileToggle satellite={satellite} onToggle={toggleSatellite} />
        </div>

      {/* Smoothly pan to selected stop or user location */}
      <MapPanner
        lat={selectedStop ? selectedStop.latitude : userLat}
        lon={selectedStop ? selectedStop.longitude : userLon}
      />

      {/* User position */}
      <Marker position={[userLat, userLon]} icon={userIcon}>
        <Popup>
          <div className="popup-card" style={{ minWidth: 120 }}>
            <p className="popup-name" style={{ fontWeight: 700 }}>{t('nearby.yourLocation', { defaultValue: 'Konumunuz' })}</p>
          </div>
        </Popup>
      </Marker>

      {/* Stop markers — capped at 20 to limit Leaflet layer count */}
      {stops.slice(0, 20).map((s) => {
        const isSel = s.stop_code === selectedCode
        return (
          <CircleMarker
            key={s.stop_code}
            center={[s.latitude, s.longitude]}
            radius={isSel ? 12 : 7}
            pathOptions={
              isSel
                ? { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.95, weight: 2.5 }
                : { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.75, weight: 1.5 }
            }
            eventHandlers={{ click: () => { onSelect(s.stop_code) } }}
          >
            <Popup minWidth={190}>
              <div className="popup-card">
                <p className="popup-stop-name">{s.stop_name}</p>
                {s.direction && (
                  <span className="popup-direction-badge">&#8594; {s.direction}</span>
                )}
                <div style={{ display: 'block', marginBottom: 6 }}>
                  <span className="popup-distance-badge">{distanceLabel(s.distance_m)}</span>
                </div>
                {s.routes.length > 0 && (
                  <div className="popup-route-pills">
                    {s.routes.map((r) => (
                      <span key={r} className="popup-route-pill">{r}</span>
                    ))}
                  </div>
                )}
                <Link to={`/stops/${s.stop_code}`} className="popup-link-btn">
                  {t('nearby.arrivals', { defaultValue: 'Varış Saatleri' })}
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

function NearbyLocationModal({
  currentLat,
  currentLon,
  onSelect,
  onClose,
}: {
  currentLat: number
  currentLon: number
  onSelect: (lat: number, lon: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<[number, number]>([currentLat, currentLon])
  const pickedIcon = useMemo(() => L.divIcon({
    className: '',
    html: '<div style="background:#ef4444;border-radius:50%;width:20px;height:20px;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), [])
  const { currentUrl, currentAttribution, mapClassName, tileClassName } = useMapTiles()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        setPicked([e.latlng.lat, e.latlng.lng])
      },
    })
    return null
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nearby-modal-title"
        className="bg-surface-card border border-surface-border rounded-2xl max-w-lg w-full p-4 shadow-2xl flex flex-col gap-3 h-[460px]"
      >
        <div className="flex items-center justify-between">
          <h2 id="nearby-modal-title" className="text-sm font-bold text-text-primary">
            📍 {t('nearby.pickFromMap', 'Haritadan Konum Seç')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Kapat')}
            className="text-text-muted hover:text-text-primary text-lg font-bold p-1 leading-none"
          >
            &times;
          </button>
        </div>

        <p className="text-[11px] text-text-muted">
          {t('nearby.mapInstruction', 'Haritaya uzun bas veya tıkla → pin bırak, sonra aramayı başlat')}
        </p>

        <div className="flex-1 rounded-xl overflow-hidden border border-surface-border relative">
          <MapContainer
            center={picked}
            zoom={14}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxBounds={ISTANBUL_BOUNDS}
            style={{ height: '100%', width: '100%' }}
            className={mapClassName}
          >
            <TileLayer
              key={currentUrl}
              className={tileClassName}
              attribution={currentAttribution}
              url={currentUrl}
              keepBuffer={1}
              updateWhenIdle={true}
              updateWhenZooming={false}
            />
            <MapClickHandler />
            <Marker position={picked} icon={pickedIcon} />
          </MapContainer>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono text-text-muted">
            {picked[0].toFixed(4)}, {picked[1].toFixed(4)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded-lg border border-surface-border"
            >
              {t('nearby.closeModal', 'İptal')}
            </button>
            <button
              onClick={() => {
                onSelect(picked[0], picked[1])
                onClose()
              }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow cursor-pointer"
            >
              {t('nearby.selectThisPoint', 'Bu Noktayı Seç')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function NearbyPage() {
  const { t } = useTranslation()
  const { prefs } = useUserPrefs()
  const { location, loading: gpsLoading, requestLocation } = useLocationManager()

  const [searchParams] = useSearchParams()

  const [overrideLocation, setOverrideLocation] = useState<{ lat: number; lon: number } | null>(() => {
    const latParam = Number(searchParams.get('lat'))
    const lonParam = Number(searchParams.get('lon'))
    if (Number.isFinite(latParam) && Number.isFinite(lonParam) && latParam !== 0 && lonParam !== 0) {
      return { lat: latParam, lon: lonParam }
    }
    return null
  })
  const [showLocationModal, setShowLocationModal] = useState(false)
  const effectiveLat = overrideLocation ? overrideLocation.lat : location ? location[0] : null
  const effectiveLon = overrideLocation ? overrideLocation.lon : location ? location[1] : null
  const effectiveLocation = useMemo<[number, number] | null>(
    () => (effectiveLat != null && effectiveLon != null ? [effectiveLat, effectiveLon] : null),
    [effectiveLat, effectiveLon],
  )

  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [allStops, setAllStops] = useState<NearbyStop[]>([])

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Track latest selectedCode in a ref so the RAF scroll callback doesn't
  // capture stale closure values (stable callback with no deps).
  const selectedCodeRef = useRef<string | null>(null)
  useEffect(() => {
    selectedCodeRef.current = selectedCode
  }, [selectedCode])

  // Flag that prevents handleListScroll from overriding a programmatic
  // selection triggered by a map-marker click (set before scrollIntoView,
  // cleared after the smooth-scroll animation settles).
  const isProgrammaticScrollRef = useRef(false)

  // RAF token to deduplicate rapid scroll events.
  const scrollRafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [])

  // When selectedCode changes from a map click, scroll the list to that item.
  // Guards against running during list-driven changes (isProgrammaticScrollRef
  // is only true when the change originated from handleMapSelect).
  useEffect(() => {
    if (!isProgrammaticScrollRef.current) return
    if (!selectedCode || !listRef.current) return
    const el = itemRefs.current.get(selectedCode)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    // Reset flag after smooth-scroll animation settles (~400ms)
    const t = window.setTimeout(() => { isProgrammaticScrollRef.current = false }, 400)
    return () => clearTimeout(t)
  }, [selectedCode])

  // Scroll handler: RAF-throttled, blocked during programmatic scroll,
  // no selectedCode dep needed because we read from a ref.
  const handleListScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      if (!listRef.current) return
      const containerTop = listRef.current.getBoundingClientRect().top
      let bestCode: string | null = null
      let bestOffset = Infinity
      for (const [code, el] of itemRefs.current.entries()) {
        const offsetFromTop = el.getBoundingClientRect().top - containerTop
        if (offsetFromTop >= -(el.offsetHeight * 0.5) && offsetFromTop < bestOffset) {
          bestOffset = offsetFromTop
          bestCode = code
        }
      }
      if (bestCode && bestCode !== selectedCodeRef.current) setSelectedCode(bestCode)
    })
  }, []) // stable: reads all state from refs

  const handleMapSelect = useCallback((code: string) => {
    isProgrammaticScrollRef.current = true
    setSelectedCode(code)
  }, [])

  const fetchNearby = useCallback(async (lat: number, lon: number, signal?: AbortSignal) => {
    setPhase('loading')
    setSelectedCode(null)
    try {
      const nearby = await api.stops.nearby(lat, lon, prefs.nearbyMax, prefs.nearbyRadius, { signal })
      if (signal?.aborted) return
      const base: NearbyStop[] = [...nearby]
        .sort((a, b) => (Number(a.distance_m) || 0) - (Number(b.distance_m) || 0))
        .map((s) => ({ ...s, routes: [] }))
      setAllStops(base)
      setSelectedCode(base[0]?.stop_code ?? null)
      setPhase('done')
      // Silently enrich route pills in the background in chunks of 5 to prevent unbounded concurrency
      const enriched: PromiseSettledResult<string[]>[] = []
      for (let i = 0; i < nearby.length; i += 5) {
        if (signal?.aborted) return
        const chunk = nearby.slice(i, i + 5)
        const results = await Promise.allSettled(
          chunk.map((s) => api.stops.routes(s.stop_code, { signal }))
        )
        if (signal?.aborted) return
        enriched.push(...results)
      }
      if (signal?.aborted) return
      // Build stop_code → routes map (enriched is indexed by original nearby order)
      const routeMap = new Map(
        nearby.map((s, i) => [
          s.stop_code,
          enriched[i]?.status === 'fulfilled' ? (enriched[i] as PromiseFulfilledResult<string[]>).value : [],
        ]),
      )
      setAllStops(
        [...nearby]
          .sort((a, b) => (Number(a.distance_m) || 0) - (Number(b.distance_m) || 0))
          .map((s) => ({
            ...s,
            routes: routeMap.get(s.stop_code) ?? [],
          })),
      )
    } catch (err) {
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) return
      setPhase('error')
      setErrorMsg(t('nearby.stopsFailed', { defaultValue: 'Duraklar yüklenemedi. Lütfen tekrar deneyin.' }))
    }
  }, [prefs.nearbyMax, prefs.nearbyRadius, t])

  // ── React to LocationManager ─────────────────────────────────────────────
  useEffect(() => {
    if (effectiveLat == null || effectiveLon == null) return
    const controller = new AbortController()
    fetchNearby(effectiveLat, effectiveLon, controller.signal)
    return () => {
      controller.abort()
    }
  }, [effectiveLat, effectiveLon, fetchNearby])


  // ── Shared header ────────────────────────────────────────────────────────────
  const headerBar = (
    <div className="bg-surface-card border-b border-surface-muted shrink-0 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary">{t('home.nearbyStops', { defaultValue: 'Yakın Duraklar' })}</h1>
          {effectiveLocation && (
            <p className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
              <span>{effectiveLocation[0].toFixed(4)}, {effectiveLocation[1].toFixed(4)}</span>
              {overrideLocation && (
                <span className="text-[9px] bg-brand-500/20 text-brand-300 font-bold px-1.5 py-0.5 rounded">
                  {t('nearby.temporaryLocation', 'Tek Seferlik')}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {overrideLocation && (
            <button
              onClick={() => setOverrideLocation(null)}
              title={t('nearby.resetToGps', 'GPS Konumuna Dön')}
              className="px-2 py-1 text-xs text-text-muted hover:text-text-primary bg-surface-muted hover:bg-surface-muted/80 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="font-bold">&times;</span>
              <span className="text-[11px]">{t('common.reset', 'Sıfırla')}</span>
            </button>
          )}

          <button
            onClick={() => setShowLocationModal(true)}
            title={t('nearby.pickFromMap', 'Haritadan Seç')}
            className="px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors flex items-center gap-1 border border-surface-border cursor-pointer"
            aria-label={t('nearby.pickFromMap', 'Haritadan Seç')}
          >
            <span className="text-sm">📍</span>
            <span className="text-xs font-semibold">{t('nearby.changeLocation', 'Konum Seç')}</span>
          </button>
        </div>
      </div>
    </div>
  )

  // ── Loading phase ────────────────────────────────────────────────────────
  if ((gpsLoading && !overrideLocation) || phase === 'loading' || !effectiveLocation) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {headerBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <svg className="w-8 h-8 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-text-secondary text-sm font-medium">
            {gpsLoading && !overrideLocation ? t('common.locating', { defaultValue: 'Konum alınıyor...' }) : t('common.loading', { defaultValue: 'Yükleniyor...' })}
          </p>
        </div>
        {showLocationModal && (
          <NearbyLocationModal
            currentLat={effectiveLocation ? effectiveLocation[0] : 41.015}
            currentLon={effectiveLocation ? effectiveLocation[1] : 28.98}
            onSelect={(lat, lon) => setOverrideLocation({ lat, lon })}
            onClose={() => setShowLocationModal(false)}
          />
        )}
      </div>
    )
  }

  // ── Done phase — split layout (map on top, list below) ──────────────────────
  if (phase === 'done' && effectiveLocation !== null) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {headerBar}

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Map — top 45% */}
          <div className="shrink-0 border-b border-surface-muted" style={{ height: '45%' }}>
            <NearbyMapView
              stops={allStops}
              userLat={effectiveLocation[0]}
              userLon={effectiveLocation[1]}
              selectedCode={selectedCode}
              onSelect={handleMapSelect}
            />
          </div>

          {/* List — remaining 55%, scrollable */}
          <PullToRefresh
            innerRef={listRef}
            onScroll={handleListScroll}
            onRefresh={async () => {
              if (overrideLocation) {
                await fetchNearby(overrideLocation.lat, overrideLocation.lon)
              } else {
                requestLocation?.()
              }
              await new Promise(r => setTimeout(r, 600))
            }}
          >
            {prefs.gpsConsent === 'denied' && (
              <div className="bg-surface-muted border-b border-surface-border py-1.5 px-4 text-center">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: 'var(--color-warning)' }}
                >
                  {t('nearby.mockLocationError', { defaultValue: 'Konum izni reddedildi · Mock konum' })}
                </span>
              </div>
            )}

            {allStops.length === 0 && (
              <p className="text-center text-text-muted py-12 text-sm">{t('nearby.noStopsFound', { defaultValue: 'Yakında durak bulunamadı' })}</p>
            )}

            {allStops.map((stop) => {
              const isSel = stop.stop_code === selectedCode
              return (
                <div
                  key={stop.stop_code}
                  ref={(el) => {
                    if (el) itemRefs.current.set(stop.stop_code, el)
                    else itemRefs.current.delete(stop.stop_code)
                  }}
                >
                  <Link
                    to={`/stops/${stop.stop_code}`}
                    className={`flex items-center gap-3 px-4 py-3.5 border-b transition-colors ${
                      isSel
                        ? 'bg-orange-950/30 border-orange-800/40'
                        : 'border-surface-muted active:bg-surface-muted/50'
                    }`}
                    onClick={() => {
                      // List click: do NOT set isProgrammaticScrollRef —
                      // no auto-scroll needed and the handler should stay unblocked.
                      setSelectedCode(stop.stop_code)
                    }}
                  >
                    {/* Distance badge */}
                    <div className={`shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-xl min-w-[58px] text-center ${
                      stop.distance_m < 200
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : stop.distance_m < 500
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-surface-muted text-text-secondary'
                    }`}>
                      {distanceLabel(stop.distance_m)}
                    </div>

                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSel ? 'text-orange-300' : 'text-text-primary'}`}>
                        {stop.stop_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-text-muted font-mono">#{stop.stop_code}</span>
                        {stop.direction && (
                          <span className="text-[10px] text-text-muted">&#8594;&nbsp;{stop.direction}</span>
                        )}
                        {stop.routes.slice(0, 5).map((r) => (
                          <span
                            key={r}
                            className="text-[10px] bg-brand-900/60 text-brand-300 px-1 py-0.5 rounded"
                          >
                            {r}
                          </span>
                        ))}
                        {stop.routes.length > 5 && (
                          <span className="text-[10px] text-text-muted">+{stop.routes.length - 5}</span>
                        )}
                      </div>
                    </div>

                    <svg
                      className={`w-4 h-4 shrink-0 ${isSel ? 'text-orange-400' : 'text-text-muted'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </div>
              )
            })}

            {/* Spacer for bottom tab bar */}
            <div className="h-14" aria-hidden="true" />
          </PullToRefresh>
        </div>

        {showLocationModal && (
          <NearbyLocationModal
            currentLat={effectiveLocation[0]}
            currentLon={effectiveLocation[1]}
            onSelect={(lat, lon) => setOverrideLocation({ lat, lon })}
            onClose={() => setShowLocationModal(false)}
          />
        )}
      </div>
    )
  }

  // ── Error phase ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {headerBar}

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-6 pt-4">
        {phase === 'error' && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-5 py-4 text-red-300 text-sm w-full text-center">
              {errorMsg || t('nearby.stopsFailed', { defaultValue: 'Duraklar yüklenemedi. Lütfen tekrar deneyin.' })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => requestLocation?.()} className="btn-primary">
                {t('common.retry', { defaultValue: 'Tekrar Dene' })}
              </button>
            </div>
          </div>
        )}
      </div>

      {showLocationModal && (
        <NearbyLocationModal
          currentLat={effectiveLocation ? effectiveLocation[0] : 41.015}
          currentLon={effectiveLocation ? effectiveLocation[1] : 28.98}
          onSelect={(lat, lon) => setOverrideLocation({ lat, lon })}
          onClose={() => setShowLocationModal(false)}
        />
      )}
    </div>
  )
}
