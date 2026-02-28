import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMapEvents } from 'react-leaflet'
import * as L from 'leaflet'
import { api, type NearbyStop as ApiNearbyStop } from '@/api/client'
import { distanceLabel } from '@/utils/distance'
import LocationConsentModal from '@/components/LocationConsentModal'

interface NearbyStop extends ApiNearbyStop {
  routes: string[]
}

type Phase = 'idle' | 'consent' | 'locating' | 'loading' | 'done' | 'error'

const SETTINGS_KEY = 'iett_settings'

export default function NearbyPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [allStops, setAllStops] = useState<NearbyStop[]>([])
  const [view, setView] = useState<'list' | 'map'>('list')
  const [pickedLat, setPickedLat] = useState<number | null>(null)
  const [pickedLon, setPickedLon] = useState<number | null>(null)

  useEffect(() => {
    // Auto-locate if user previously granted permission and has autoLocate enabled
    const raw = localStorage.getItem(SETTINGS_KEY)
    let autoLocate = false
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { autoLocate?: boolean }
        autoLocate = parsed.autoLocate ?? false
      } catch {
        autoLocate = false
      }
    }
    if (!autoLocate) return
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms || typeof perms.query !== 'function') return
    perms
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => { if (status.state === 'granted') locate() })
      .catch(() => { /* permissions API query failed */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function requestLocate() {
    // Check permission without triggering the browser prompt
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms || typeof perms.query !== 'function') {
      // Permissions API unavailable — show consent modal to be safe
      setPhase('consent')
      return
    }
    try {
      const status = await perms.query({ name: 'geolocation' as PermissionName })
      if (status.state === 'granted') {
        locate()
      } else {
        setPhase('consent')
      }
    } catch {
      // Permissions API query failed — show consent modal to be safe
      setPhase('consent')
    }
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
    try {
      const nearby = await api.stops.nearby(lat, lon)
      const base: NearbyStop[] = nearby.map((s) => ({ ...s, routes: [] }))
      setAllStops(base)
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-muted sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-100">Yakın Duraklar</h1>
            {userLat && (
              <p className="text-[11px] text-slate-500">
                {userLat.toFixed(4)}, {userLon?.toFixed(4)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex gap-0.5 bg-surface-muted rounded-lg p-0.5">
              {(['list', 'map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    view === v ? 'bg-surface-card text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {v === 'list' ? 'Liste' : 'Harita'}
                </button>
              ))}
            </div>

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
              <svg className={`w-5 h-5 ${phase === 'loading' ? 'animate-spin' : ''}`}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-28 pt-4">

        {/* Idle — map location picker */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500 text-center">
              Haritaya uzun bas veya tıkla → pin bırak, sonra aramayı başlat
            </p>
            <div className="relative rounded-2xl overflow-hidden border border-surface-muted" style={{ height: 420 }}>
              <MapContainer
                center={[41.015, 28.98]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; CartoDB'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <LocationPickerEvents onPick={(lat, lon) => { setPickedLat(lat); setPickedLon(lon) }} />
                {pickedLat !== null && pickedLon !== null && (
                  <Marker
                    position={[pickedLat, pickedLon]}
                    icon={L.divIcon({
                      className: '',
                      html: `<div style="background:#2563eb;border-radius:50%;width:16px;height:16px;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.4)"></div>`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8],
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

        {/* Consent modal */}
        {phase === 'consent' && (
          <LocationConsentModal
            onConfirm={() => locate()}
            onDismiss={() => setPhase('idle')}
          />
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-5 py-4 text-red-300 text-sm w-full">
              {errorMsg}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPhase('idle')} className="bg-surface-muted hover:bg-slate-600 text-slate-300 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                Haritadan Belirt
              </button>
              <button onClick={() => requestLocate()} className="btn-primary">
                Tekrar Dene
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'done' && view === 'list' && (
          <div className="flex flex-col gap-2">
            {allStops.length === 0 && (
              <p className="text-center text-slate-500 py-12 text-sm">Yakında durak bulunamadı</p>
            )}
            {allStops.map((stop) => (
              <Link
                key={stop.stop_code}
                to={`/stops/${stop.stop_code}`}
                className="card flex items-center gap-3 py-3.5 hover:border-slate-500 transition-colors active:scale-[0.99]"
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
                  <p className="text-sm font-semibold text-slate-200 truncate">{stop.stop_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-slate-600 font-mono">#{stop.stop_code}</span>
                    {stop.routes.slice(0, 5).map((r) => (
                      <span key={r}
                            className="text-[10px] bg-brand-900/60 text-brand-300 px-1 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                    {stop.routes.length > 5 && (
                      <span className="text-[10px] text-slate-600">+{stop.routes.length - 5}</span>
                    )}
                  </div>
                </div>

                <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* Map view */}
        {phase === 'done' && view === 'map' && userLat && userLon && (
          <NearbyMapView stops={allStops} userLat={userLat} userLon={userLon} />
        )}
      </div>
    </div>
  )
}

// Invisible map layer that fires onPick on every click
function LocationPickerEvents({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Results map view
function NearbyMapView({ stops, userLat, userLon }: {
  stops: NearbyStop[]
  userLat: number
  userLon: number
}) {
  const userIcon = L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;border-radius:50%;width:14px;height:14px;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-muted" style={{ height: 480 }}>
      <MapContainer center={[userLat, userLon]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; CartoDB'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[userLat, userLon]} icon={userIcon}>
          <Popup>Konumunuz</Popup>
        </Marker>
        {stops.slice(0, 20).map((s) => (
          <CircleMarker
            key={s.stop_code}
            center={[s.latitude, s.longitude]}
            radius={6}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8 }}
          >
            <Popup minWidth={180}>
              <div style={{ fontFamily: 'inherit', minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{s.stop_name}</div>
                {s.direction && (
                  <div style={{ display: 'inline-block', background: '#1e40af', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11, marginBottom: 4 }}>
                    → {s.direction}
                  </div>
                )}
                <div style={{ marginBottom: 4 }}>
                  <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: '#475569' }}>
                    {distanceLabel(s.distance_m)}
                  </span>
                </div>
                {s.routes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                    {s.routes.map((r) => (
                      <span key={r} style={{ background: '#0f172a', color: '#38bdf8', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>{r}</span>
                    ))}
                  </div>
                )}
                <Link to={`/stops/${s.stop_code}`} style={{ display: 'block', textAlign: 'center', background: '#2563eb', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Varış Saatleri</Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
