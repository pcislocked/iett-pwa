import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import type { BusPosition } from '@/api/client'

// Renk paleti — seçili hatlar farklı renk alır
const PALETTE = ['#f97316','#22c55e','#3b82f6','#a855f7','#ef4444']
const DEFAULT_COLOR = '#3b82f6'

interface Props {
  buses: BusPosition[]
  selectedRoutes: string[]            // Hangi hatlar seçili (renklendirme için)
  selectedKapino: string | null       // Seçili araç (trail sadece buna çizilir)
  onBusClick: (kapino: string) => void
  onMultiBusClick: (buses: BusPosition[]) => void  // Üst üste binen araçlar
}

export default function CanvasFleetLayer({ buses, selectedRoutes, selectedKapino, onBusClick, onMultiBusClick }: Props) {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)
  const rendererRef = useRef<L.Canvas | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const trailsRef = useRef<L.Polyline[]>([])
  const timerRef = useRef<number | null>(null)

  // Renderer bir kere oluşturulur
  useEffect(() => {
    rendererRef.current = L.canvas({ padding: 0.5 })
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      layerRef.current?.remove()
      layerRef.current = null
      rendererRef.current = null
    }
  }, [map])

  // buses veya selectedRoutes değişince marker'ları güncelle
  useEffect(() => {
    const layer = layerRef.current
    const renderer = rendererRef.current
    if (!layer || !renderer) return

    // Eski marker'ları temizle
    markersRef.current.forEach(m => m.remove())
    trailsRef.current.forEach(t => t.remove())
    markersRef.current = []
    trailsRef.current = []

    const zoom = map.getZoom()
    // Zoom-based sizing
    const radius = zoom < 12 ? 2 : zoom < 14 ? 4 : 6

    for (const bus of buses) {
      if (!Number.isFinite(bus.latitude) || !Number.isFinite(bus.longitude)) continue

      // Renk: seçili hat varsa o hattın rengi, yoksa varsayılan
      const routeIdx = bus.route_code ? selectedRoutes.indexOf(bus.route_code) : -1
      const color = routeIdx >= 0 ? PALETTE[routeIdx % PALETTE.length] : DEFAULT_COLOR

      const marker = L.circleMarker([bus.latitude, bus.longitude], {
        renderer,
        radius,
        fillColor: color,
        fillOpacity: 0.85,
        color: 'rgba(255,255,255,0.4)',
        weight: 1,
        interactive: true,    // ← TIKLANABILIR
      })

      marker.on('click', () => {
        // 20px threshold içindeki tüm araçları bul
        const clickPt = map.latLngToContainerPoint(marker.getLatLng())
        const nearby = buses.filter(b => {
          if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return false
          const pt = map.latLngToContainerPoint([b.latitude, b.longitude])
          return clickPt.distanceTo(pt) < 20
        })
        if (nearby.length > 1) {
          onMultiBusClick(nearby)
        } else {
          onBusClick(bus.kapino)
        }
      })

      marker.addTo(layer)
      markersRef.current.push(marker)

      // Trail çizgileri — sadece seçili araç için
      if (selectedKapino === bus.kapino && bus.trail && bus.trail.length > 1) {
        const pts: [number, number][] = bus.trail
          .filter(t => Number.isFinite(t.lat) && Number.isFinite(t.lon))
          .map(t => [t.lat, t.lon])

        if (pts.length > 0) {
          pts.push([bus.latitude, bus.longitude])
          const trail = L.polyline(pts, {
            renderer,
            color,
            weight: 2,
            opacity: 0.8,
            interactive: false,  // Trail'a tıklanmaz
          })
          trail.addTo(layer)
          trailsRef.current.push(trail)
        }
      }
    }
  }, [buses, selectedRoutes, selectedKapino, map, onBusClick, onMultiBusClick])

  // Zoom değişince marker boyutlarını güncelle
  useEffect(() => {
    const onZoom = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        const zoom = map.getZoom()
        const radius = zoom < 12 ? 2 : zoom < 14 ? 4 : 6
        markersRef.current.forEach(m => m.setRadius(radius))

        // Note: Full re-render for trails isn't strictly necessary for radius changes,
        // but if we wanted to toggle trails on/off dynamically based on zoom,
        // we would trigger a state change here to re-run the marker rendering effect.
        // For performance, we'll just keep the trails that were drawn when `buses` last updated.
      }, 100)
    }

    map.on('zoomend', onZoom)
    return () => {
      map.off('zoomend', onZoom)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [map])

  return null
}
