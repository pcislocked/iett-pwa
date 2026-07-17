import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Marker,
  useMap,
} from 'react-leaflet'
import * as L from 'leaflet'
import { api, type NearbyStop as ApiNearbyStop } from '@/api/client'
import { distanceLabel } from '@/utils/distance'
import { useTranslation } from 'react-i18next'
import { useUserPrefs } from '@/hooks/useUserPrefs'
import { useLocationManager } from '@/hooks/useLocationManager'
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
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; CartoDB'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Smoothly pan to selected stop */}
      {selectedStop && (
        <MapPanner lat={selectedStop.latitude} lon={selectedStop.longitude} />
      )}

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

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function NearbyPage() {
  const { t } = useTranslation()
  const { prefs } = useUserPrefs()
  const { location, loading: gpsLoading, requestLocation } = useLocationManager()

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

  const fetchNearby = useCallback(async (lat: number, lon: number) => {
    setPhase('loading')
    setSelectedCode(null)
    try {
      const nearby = await api.stops.nearby(lat, lon, prefs.nearbyMax, prefs.nearbyRadius)
      const base: NearbyStop[] = [...nearby]
        .sort((a, b) => (Number(a.distance_m) || 0) - (Number(b.distance_m) || 0))
        .map((s) => ({ ...s, routes: [] }))
      setAllStops(base)
      setSelectedCode(base[0]?.stop_code ?? null)
      setPhase('done')
      // Silently enrich route pills in the background in chunks of 5 to prevent unbounded concurrency
      const enriched: PromiseSettledResult<string[]>[] = []
      for (let i = 0; i < nearby.length; i += 5) {
        const chunk = nearby.slice(i, i + 5)
        const results = await Promise.allSettled(
          chunk.map((s) => api.stops.routes(s.stop_code))
        )
        enriched.push(...results)
      }
      // Build stop_code → routes map (enriched is indexed by original nearby order)
      const routeMap = new Map(
        nearby.map((s, i) => [
          s.stop_code,
          enriched[i].status === 'fulfilled' ? (enriched[i] as PromiseFulfilledResult<string[]>).value : [],
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
    } catch {
      setPhase('error')
      setErrorMsg(t('nearby.stopsFailed', { defaultValue: 'Duraklar yüklenemedi. Lütfen tekrar deneyin.' }))
    }
  }, [prefs.nearbyMax, prefs.nearbyRadius, t])

  // ── React to LocationManager ─────────────────────────────────────────────
  useEffect(() => {
    if (location) {
      fetchNearby(location[0], location[1])
    }
  }, [location, fetchNearby])


  // ── Shared header ────────────────────────────────────────────────────────────
  const headerBar = (
    <div className="bg-surface-card border-b border-surface-muted shrink-0 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary">{t('home.nearbyStops', { defaultValue: 'Yakın Duraklar' })}</h1>
          {location && (
            <p className="text-[11px] text-text-muted">
              {location[0].toFixed(4)}, {location[1].toFixed(4)}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  // ── Loading phase ────────────────────────────────────────────────────────
  if (gpsLoading || phase === 'loading' || !location) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {headerBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <svg className="w-8 h-8 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-text-secondary text-sm font-medium">
            {gpsLoading ? t('common.locating', { defaultValue: 'Konum alınıyor...' }) : t('common.loading', { defaultValue: 'Yükleniyor...' })}
          </p>
        </div>
      </div>
    )
  }

  // ── Done phase — split layout (map on top, list below) ──────────────────────
  if (phase === 'done' && location !== null) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {headerBar}

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Map — top 45% */}
          <div className="shrink-0 border-b border-surface-muted" style={{ height: '45%' }}>
            <NearbyMapView
              stops={allStops}
              userLat={location[0]}
              userLon={location[1]}
              selectedCode={selectedCode}
              onSelect={handleMapSelect}
            />
          </div>

          {/* List — remaining 55%, scrollable */}
          <PullToRefresh
            innerRef={listRef}
            onScroll={handleListScroll}
            onRefresh={async () => {
              requestLocation?.()
              await new Promise(r => setTimeout(r, 600))
            }}
          >
            {prefs.gpsConsent === 'denied' && (
              <div className="bg-amber-900/40 border-b border-amber-800/50 py-1.5 px-4 text-center">
                <span className="text-[10px] text-amber-500/90 font-bold tracking-wider uppercase">Konum izni reddedildi · Mock konum</span>
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
    </div>
  )
}
