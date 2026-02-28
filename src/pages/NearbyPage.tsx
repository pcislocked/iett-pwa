import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import * as L from 'leaflet'
import { api, type NearbyStop as ApiNearbyStop } from '@/api/client'
import { distanceLabel } from '@/utils/distance'
import { loadSettings } from '@/utils/settings'
import LocationConsentModal from '@/components/LocationConsentModal'

interface NearbyStop extends ApiNearbyStop {
  routes: string[]
}

type Phase = 'idle' | 'consent' | 'locating' | 'loading' | 'done' | 'error'

// ─── Map panner — pans to a coordinate when it changes ────────────────────────
function MapPanner({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([lat, lon], { animate: true, duration: 0.35 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])
  return null
}

// ─── Location picker (idle phase) ─────────────────────────────────────────────
function LocationPickerEvents({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng) },
  })
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
            <p className="popup-name" style={{ fontWeight: 700 }}>Konumunuz</p>
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
                  Varış Saatleri
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
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [allStops, setAllStops] = useState<NearbyStop[]>([])
  const [pickedLat, setPickedLat] = useState<number | null>(null)
  const [pickedLon, setPickedLon] = useState<number | null>(null)

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Track latest selectedCode in a ref so the RAF scroll callback doesn't
  // capture stale closure values (stable callback with no deps).
  const selectedCodeRef = useRef<string | null>(null)
  selectedCodeRef.current = selectedCode

  // Flag that prevents handleListScroll from overriding a programmatic
  // selection triggered by a map-marker click (set before scrollIntoView,
  // cleared after the smooth-scroll animation settles).
  const isProgrammaticScrollRef = useRef(false)

  // RAF token to deduplicate rapid scroll events.
  const scrollRafRef = useRef<number | null>(null)

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

  // ── Auto-locate on mount if permission already granted ─────────────────────
  useEffect(() => {
    const { autoLocate } = loadSettings()
    if (!autoLocate) return
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms || typeof perms.query !== 'function') return
    let cancelled = false
    perms
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => { if (!cancelled && status.state === 'granted') locate() })
      .catch(() => { /* permissions API unavailable */ })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function requestLocate() {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms || typeof perms.query !== 'function') { setPhase('consent'); return }
    try {
      const status = await perms.query({ name: 'geolocation' as PermissionName })
      if (status.state === 'denied') {
        setPhase('error')
        setErrorMsg('Konum izni reddedildi. Tarayıcı ayarlarından izin verin.')
        return
      }
      if (status.state === 'granted') {
        void locate()
      } else {
        setPhase('consent')
      }
    } catch { setPhase('consent') }
  }

  async function locate() {
    setPhase('locating')
    setErrorMsg('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserLat(lat)
        setUserLon(lon)
        await fetchNearby(lat, lon)
      },
      (err) => {
        setPhase('error')
        setErrorMsg(
          err.code === 1
            ? 'Konum izni reddedildi. Tarayıcı ayarlarından izin verin.'
            : 'Konum alınamadı. Lütfen tekrar deneyin.',
        )
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function fetchNearby(lat: number, lon: number) {
    setPhase('loading')
    setSelectedCode(null)
    try {
      const nearby = await api.stops.nearby(lat, lon)
      const base: NearbyStop[] = nearby.map((s) => ({ ...s, routes: [] }))
      setAllStops(base)
      setSelectedCode(base[0]?.stop_code ?? null)
      setPhase('done')
      // Silently enrich route pills in the background
      const enriched = await Promise.allSettled(
        nearby.map((s) => api.stops.routes(s.stop_code)),
      )
      setAllStops(
        nearby.map((s, i) => ({
          ...s,
          routes: enriched[i].status === 'fulfilled' ? enriched[i].value : [],
        })),
      )
    } catch {
      setPhase('error')
      setErrorMsg('Duraklar yüklenemedi. Lütfen tekrar deneyin.')
    }
  }

  function handleManual() {
    if (pickedLat !== null && pickedLon !== null) {
      setUserLat(pickedLat)
      setUserLon(pickedLon)
      fetchNearby(pickedLat, pickedLon)
    }
  }

  // ── Shared header ────────────────────────────────────────────────────────────
  const headerBar = (
    <div className="bg-surface-card border-b border-surface-muted shrink-0 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-100">Yakın Duraklar</h1>
          {userLat !== null && (
            <p className="text-[11px] text-slate-500">
              {userLat.toFixed(4)}, {userLon?.toFixed(4)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPhase('idle'); setPickedLat(null); setPickedLon(null) }}
            disabled={phase === 'locating' || phase === 'loading'}
            className="p-1.5 text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
            aria-label="Konumu Değiştir"
            title="Konum Seç"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </button>
          <button
            onClick={requestLocate}
            disabled={phase === 'locating' || phase === 'loading'}
            className="p-1.5 text-brand-400 hover:text-brand-300 disabled:opacity-40 transition-colors"
            aria-label="Yenile"
          >
            <svg
              className={`w-5 h-5 ${phase === 'loading' ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  // ── Consent phase — modal overlay ──────────────────────────────────────────
  if (phase === 'consent') {
    return (
      <LocationConsentModal
        onConfirm={() => { void locate() }}
        onDismiss={() => setPhase('idle')}
      />
    )
  }

  // ── Done phase — split layout (map on top, list below) ──────────────────────
  if (phase === 'done' && userLat !== null && userLon !== null) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {headerBar}

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Map — top 45% */}
          <div className="shrink-0 border-b border-surface-muted" style={{ height: '45%' }}>
            <NearbyMapView
              stops={allStops}
              userLat={userLat}
              userLon={userLon}
              selectedCode={selectedCode}
              onSelect={handleMapSelect}
            />
          </div>

          {/* List — remaining 55%, scrollable */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto"
            onScroll={handleListScroll}
          >
            {allStops.length === 0 && (
              <p className="text-center text-slate-500 py-12 text-sm">Yakında durak bulunamadı</p>
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
                        : 'bg-surface-muted text-slate-400'
                    }`}>
                      {distanceLabel(stop.distance_m)}
                    </div>

                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSel ? 'text-orange-300' : 'text-slate-200'}`}>
                        {stop.stop_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-600 font-mono">#{stop.stop_code}</span>
                        {stop.direction && (
                          <span className="text-[10px] text-slate-500">&#8594;&nbsp;{stop.direction}</span>
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
                          <span className="text-[10px] text-slate-600">+{stop.routes.length - 5}</span>
                        )}
                      </div>
                    </div>

                    <svg
                      className={`w-4 h-4 shrink-0 ${isSel ? 'text-orange-400' : 'text-slate-600'}`}
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
          </div>
        </div>
      </div>
    )
  }

  // ── Non-done phases — standard scrollable layout ────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {headerBar}

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-28 pt-4">

        {/* Idle — map location picker */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500 text-center">
              Haritaya uzun bas veya tıkla → pin bırak, sonra aramayı başlat
            </p>
            <div
              className="relative rounded-2xl overflow-hidden border border-surface-muted"
              style={{ height: 420 }}
            >
              <MapContainer
                center={[41.015, 28.98]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; CartoDB'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <LocationPickerEvents
                  onPick={(lat, lon) => { setPickedLat(lat); setPickedLon(lon) }}
                />
                {pickedLat !== null && pickedLon !== null && (
                  <Marker
                    position={[pickedLat, pickedLon]}
                    icon={L.divIcon({
                      className: '',
                      html: `<div style="
                        background:#2563eb;border-radius:50%;
                        width:18px;height:18px;
                        border:3px solid #fff;
                        box-shadow:0 0 0 3px rgba(37,99,235,0.4)">
                      </div>`,
                      iconSize: [18, 18],
                      iconAnchor: [9, 9],
                    })}
                  />
                )}
              </MapContainer>
            </div>
            <div className="flex gap-2">
              <button
                onClick={requestLocate}
                className="flex items-center justify-center gap-2 flex-1 bg-surface-muted hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-2xl transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                GPS
              </button>
              <button
                onClick={handleManual}
                disabled={pickedLat === null}
                className="flex-[3] bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-semibold py-3 rounded-2xl transition-colors text-sm"
              >
                {pickedLat !== null ? 'Bu Noktadaki Yakın Duraklar' : 'Haritadan Nokta Seç'}
              </button>
            </div>
          </div>
        )}

        {/* Locating */}
        {phase === 'locating' && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Konum alınıyor...</p>
          </div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Yakın duraklar aranıyor…</p>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-5 py-4 text-red-300 text-sm w-full">
              {errorMsg}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('idle')}
                className="bg-surface-muted hover:bg-slate-600 text-slate-300 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Haritadan Belirt
              </button>
              <button onClick={requestLocate} className="btn-primary">
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
