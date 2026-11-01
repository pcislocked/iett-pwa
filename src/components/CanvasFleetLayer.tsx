import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import type { BusPosition, NearbyStop } from '@/api/client'

// Renk paleti — seçili hatlar farklı renk alır
const PALETTE = ['#f97316', '#3b82f6', '#a855f7', '#ef4444', '#eab308']
const DEFAULT_COLOR = '#3b82f6'

interface Props {
  buses: BusPosition[]
  stops?: NearbyStop[]
  selectedRoutes: string[]
  selectedKapino: string | null
  onBusClick: (kapino: string) => void
  onMultiBusClick: (buses: BusPosition[]) => void
  onEntityHit?: (result: { buses: BusPosition[]; stops: NearbyStop[] }) => void
}

export default function CanvasFleetLayer({
  buses,
  stops,
  selectedRoutes,
  selectedKapino,
  onBusClick,
  onMultiBusClick,
  onEntityHit,
}: Props) {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)
  const rendererRef = useRef<L.Canvas | null>(null)
  const markersMapRef = useRef<Map<string, L.CircleMarker>>(new Map())
  const trailsRef = useRef<L.Polyline[]>([])
  const timerRef = useRef<number | null>(null)
  const selectedKapinoRef = useRef<string | null>(selectedKapino)
  const latestRef = useRef({ buses, stops, onBusClick, onMultiBusClick, onEntityHit })

  useEffect(() => {
    selectedKapinoRef.current = selectedKapino
    latestRef.current = { buses, stops, onBusClick, onMultiBusClick, onEntityHit }
  }, [buses, stops, selectedKapino, onBusClick, onMultiBusClick, onEntityHit])

  useEffect(() => {
    rendererRef.current = L.canvas({ padding: 0.5 })
    layerRef.current = L.layerGroup().addTo(map)
    const markersMap = markersMapRef.current
    return () => {
      markersMap.clear()
      layerRef.current?.remove()
      layerRef.current = null
      rendererRef.current = null
    }
  }, [map])

  useEffect(() => {
    const layer = layerRef.current
    const renderer = rendererRef.current
    if (!layer || !renderer) return

    trailsRef.current.forEach((t) => t.remove())
    trailsRef.current = []

    const zoom = map.getZoom()
    const radius = zoom < 12 ? 2 : zoom < 14 ? 4 : 6
    const existingMarkers = markersMapRef.current
    const seenKapinos = new Set<string>()

    for (const bus of buses) {
      if (!Number.isFinite(bus.latitude) || !Number.isFinite(bus.longitude)) continue
      seenKapinos.add(bus.kapino)

      const isSelected = selectedKapino === bus.kapino
      const routeIdx = bus.route_code ? selectedRoutes.indexOf(bus.route_code) : -1
      const color = isSelected
        ? '#22c55e'
        : routeIdx >= 0
          ? PALETTE[routeIdx % PALETTE.length]
          : DEFAULT_COLOR
      const finalRadius = isSelected ? radius * 1.5 : radius

      let marker = existingMarkers.get(bus.kapino)
      if (marker) {
        marker.setLatLng([bus.latitude, bus.longitude])
        marker.setRadius(finalRadius)
        marker.setStyle({
          fillColor: color,
          fillOpacity: isSelected ? 1 : 0.85,
          color: isSelected ? '#10b981' : 'rgba(255,255,255,0.4)',
          weight: isSelected ? 2 : 1,
        })
      } else {
        marker = L.circleMarker([bus.latitude, bus.longitude], {
          renderer,
          radius: finalRadius,
          fillColor: color,
          fillOpacity: isSelected ? 1 : 0.85,
          color: isSelected ? '#10b981' : 'rgba(255,255,255,0.4)',
          weight: isSelected ? 2 : 1,
          interactive: true,
        })

        const kapino = bus.kapino
        marker.on('click', () => {
          const currentMarker = existingMarkers.get(kapino)
          if (!currentMarker) return
          const {
            buses: curBuses,
            stops: curStops,
            onBusClick: cbBus,
            onMultiBusClick: cbMulti,
            onEntityHit: cbHit,
          } = latestRef.current
          const clickPt = map.latLngToContainerPoint(currentMarker.getLatLng())
          const nearbyBuses = curBuses.filter((b) => {
            if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return false
            const pt = map.latLngToContainerPoint([b.latitude, b.longitude])
            return clickPt.distanceTo(pt) <= 24
          })
          const nearbyStops = (curStops || []).filter((s) => {
            if (!Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) return false
            const pt = map.latLngToContainerPoint([s.latitude, s.longitude])
            return clickPt.distanceTo(pt) <= 24
          })

          if (cbHit) {
            cbHit({ buses: nearbyBuses, stops: nearbyStops })
          } else if (nearbyStops.length > 0 || nearbyBuses.length > 1) {
            cbMulti(nearbyBuses)
          } else {
            cbBus(kapino)
          }
        })

        marker.addTo(layer)
        ;(marker as unknown as { _kapino: string })._kapino = kapino
        existingMarkers.set(kapino, marker)
      }

      if (isSelected && bus.trail && bus.trail.length > 1) {
        const pts: [number, number][] = bus.trail
          .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lon))
          .map((t) => [t.lat, t.lon])

        if (pts.length > 0) {
          pts.push([bus.latitude, bus.longitude])
          const trail = L.polyline(pts, {
            renderer,
            color,
            weight: 2,
            opacity: 0.8,
            interactive: false,
          })
          trail.addTo(layer)
          trailsRef.current.push(trail)
        }
      }
    }

    // Remove markers for buses no longer in the snapshot
    for (const [k, m] of existingMarkers.entries()) {
      if (!seenKapinos.has(k)) {
        m.remove()
        existingMarkers.delete(k)
      }
    }
  }, [buses, stops, selectedRoutes, selectedKapino, map])

  useEffect(() => {
    const onZoom = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        const zoom = map.getZoom()
        const radius = zoom < 12 ? 2 : zoom < 14 ? 4 : 6
        markersMapRef.current.forEach((m, kapino) => {
          const isSelected = kapino === selectedKapinoRef.current
          m.setRadius(isSelected ? radius * 1.5 : radius)
        })
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
