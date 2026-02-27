import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet'
import L from 'leaflet'
import { api, type RouteStop } from '@/api/client'

// Curated backbone routes covering most of Istanbul
const BACKBONE_ROUTES = [
  '14M', '15M', '16M', '22', '25E', '28', '34', '38', '44B', '48',
  '52', '56', '59', '63', '500T', 'HT1', 'HT2', 'DT1', 'DT2',
]

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceLabel(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

interface NearbyStop extends RouteStop {
  distance_m: number
  routes: string[]
}

type Phase = 'idle' | 'locating' | 'loading' | 'done' | 'error'

export default function NearbyPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [allStops, setAllStops] = useState<NearbyStop[]>([])
  const [progress, setProgress] = useState(0)
  const [view, setView] = useState<'list' | 'map'>('list')

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
    setProgress(0)

    const stopMap = new Map<string, NearbyStop>()
    let done = 0

    await Promise.allSettled(
      BACKBONE_ROUTES.map(async (route) => {
        try {
          const stops = await api.routes.stops(route)
          for (const s of stops) {
            const dist = haversineMeters(lat, lon, s.latitude, s.longitude)
            const existing = stopMap.get(s.stop_code)
            if (!existing) {
              stopMap.set(s.stop_code, { ...s, distance_m: dist, routes: [route] })
            } else {
              if (!existing.routes.includes(route)) existing.routes.push(route)
              if (dist < existing.distance_m) existing.distance_m = dist
            }
          }
        } catch {
          // Silently skip failed routes
        } finally {
          done++
          setProgress(Math.round((done / BACKBONE_ROUTES.length) * 100))
        }
      }),
    )

    const sorted = Array.from(stopMap.values())
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 30)

    setAllStops(sorted)
    setPhase('done')
  }

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              onClick={locate}
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

        {/* Locating */}
        {phase === 'idle' || phase === 'locating' ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Konum alınıyor...</p>
          </div>
        ) : null}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-48 bg-surface-muted rounded-full h-2 mb-4">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm">Duraklar yükleniyor... {progress}%</p>
            <p className="text-xs mt-1 text-slate-600">{BACKBONE_ROUTES.length} hat taranıyor</p>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-5 py-4 text-red-300 text-sm w-full">
              {errorMsg}
            </div>
            <button onClick={locate} className="btn-primary">
              Tekrar Dene
            </button>
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

// Lazy-load the map component to avoid importing Leaflet until needed
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
            <Popup>
              <strong>{s.stop_name}</strong>
              <br />{distanceLabel(s.distance_m)}
              <br />Hatlar: {s.routes.join(', ')}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
