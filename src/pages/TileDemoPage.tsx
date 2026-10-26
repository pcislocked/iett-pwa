import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TileCandidate {
  id: string
  name: string
  url: string
  attribution: string
  subdomains?: string[]
  maxZoom?: number
  hasReference?: boolean
  refUrl?: string
}

const CANDIDATES: TileCandidate[] = [
  {
    id: 'esri-dark',
    name: '1. Esri Dark Gray Base (Mevcut)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, HERE, DeLorme, MapmyIndia',
    maxZoom: 16,
  },
  {
    id: 'esri-dark-ref',
    name: '2. Esri Dark Gray + Sokak İsimleri (Reference)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, HERE',
    maxZoom: 16,
    hasReference: true,
    refUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'carto-dark',
    name: '3. CartoDB Dark Matter (Ultra Net Sokak Etiketleri)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  {
    id: 'carto-light',
    name: '4. CartoDB Positron (Açık Tema / Kiosk)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  {
    id: 'carto-voyager',
    name: '5. CartoDB Voyager (Renkli Vektör)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  {
    id: 'esri-imagery',
    name: '6. Esri World Imagery (Uydu)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
]

// Sample Kadıköy & Taksim mock stops and buses
const DEMO_STOPS = [
  { id: '1001', name: 'Kadıköy Rıhtım', lat: 40.9912, lon: 29.0245 },
  { id: '1002', name: 'Altıyol', lat: 40.9897, lon: 29.0305 },
  { id: '1003', name: 'Söğütlüçeşme', lat: 40.9934, lon: 29.0375 },
]

const DEMO_BUSES = [
  { door: 'B1234', route: '19F', lat: 40.9905, lon: 29.027 },
  { door: 'A5678', route: '500T', lat: 40.992, lon: 29.033 },
]

export default function TileDemoPage() {
  const [selectedId, setSelectedId] = useState('carto-dark')
  const [brightness, setBrightness] = useState(1.0)
  const [contrast, setContrast] = useState(1.0)
  const [tileStats, setTileStats] = useState<{ count: number; totalBytes: number }>({ count: 0, totalBytes: 0 })

  const candidate = CANDIDATES.find((c) => c.id === selectedId) || CANDIDATES[0]

  useEffect(() => {
    let count = 0
    let totalBytes = 0

    function updateMetrics() {
      if (typeof performance === 'undefined') return
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const tileResources = resources.filter(
        (r) =>
          r.name.includes('arcgisonline.com') ||
          r.name.includes('cartocdn.com') ||
          r.name.includes('openstreetmap.org'),
      )
      count = tileResources.length
      totalBytes = tileResources.reduce((acc, r) => acc + (r.transferSize || r.encodedBodySize || 12000), 0)
      setTileStats({ count, totalBytes })
    }

    const interval = setInterval(updateMetrics, 1000)
    updateMetrics()

    return () => clearInterval(interval)
  }, [selectedId])

  return (
    <div className="flex flex-col h-full bg-surface-base text-text-primary">
      {/* Header & Controls */}
      <div className="p-4 bg-surface-card border-b border-surface-border shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Harita Karoları & Kota Karşılaştırma Laboratuvarı</h1>
          <a href="/" className="text-xs text-brand-500 font-semibold hover:underline">
            &larr; Ana Sayfa
          </a>
        </div>

        {/* Candidate Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {CANDIDATES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${
                selectedId === c.id
                  ? 'border-brand-500 bg-brand-500/10 font-bold text-brand-400'
                  : 'border-surface-border hover:bg-surface-muted text-text-muted'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Live Bandwidth & Filter Stats */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-surface-muted p-2 rounded-lg">
          <div>
            <span className="text-text-muted">İndirilen Karo:</span>{' '}
            <span className="font-bold text-text-primary">{tileStats.count} adet</span>
          </div>
          <div>
            <span className="text-text-muted">Toplam Veri:</span>{' '}
            <span className="font-bold text-text-primary">{(tileStats.totalBytes / 1024).toFixed(1)} KB</span>
          </div>
          <div>
            <span className="text-text-muted">Ortalama / Karo:</span>{' '}
            <span className="font-bold text-text-primary">
              {tileStats.count > 0 ? (tileStats.totalBytes / 1024 / tileStats.count).toFixed(1) : 0} KB
            </span>
          </div>

          {/* Filter Sliders */}
          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-1">
              <span>Parlaklık:</span>
              <input
                type="range"
                min="0.4"
                max="1.5"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-20"
              />
              <span>{brightness}</span>
            </label>
            <label className="flex items-center gap-1">
              <span>Kontrast:</span>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.05"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-20"
              />
              <span>{contrast}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        <MapContainer
          center={[40.991, 29.028]}
          zoom={15}
          minZoom={10}
          maxZoom={candidate.maxZoom || 18}
          className="w-full h-full"
        >
          <div style={{ filter: `brightness(${brightness}) contrast(${contrast})` }}>
            <TileLayer
              key={`${candidate.id}-${brightness}-${contrast}`}
              url={candidate.url}
              attribution={candidate.attribution}
              subdomains={candidate.subdomains || ['a', 'b', 'c']}
              keepBuffer={1}
              updateWhenIdle={true}
              updateWhenZooming={false}
            />
            {candidate.hasReference && candidate.refUrl && (
              <TileLayer
                url={candidate.refUrl}
                keepBuffer={1}
                updateWhenIdle={true}
                updateWhenZooming={false}
              />
            )}
          </div>

          {/* Demo Stops */}
          {DEMO_STOPS.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lon]}
              radius={8}
              pathOptions={{ color: '#ffffff', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <strong>{s.name}</strong> (#{s.id})
              </Popup>
            </CircleMarker>
          ))}

          {/* Demo Buses */}
          {DEMO_BUSES.map((b) => (
            <Marker
              key={b.door}
              position={[b.lat, b.lon]}
              icon={L.divIcon({
                className: 'custom-bus-pin',
                html: `<div style="background:#2563eb;color:#fff;border-radius:12px;padding:2px 6px;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${b.route}</div>`,
                iconSize: [40, 20],
                iconAnchor: [20, 10],
              })}
            >
              <Popup>
                Kapı: {b.door} · Hat: {b.route}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
