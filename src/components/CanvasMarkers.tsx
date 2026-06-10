import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet-canvas-marker'

interface CanvasMarkersProps {
  markers: {
    position: [number, number]
    icon: L.Icon | L.DivIcon
    onClick?: (e: L.LeafletMouseEvent) => void
  }[]
}

interface ExtendedMarker extends L.Marker {
  _originalOnClick?: (e: L.LeafletMouseEvent) => void
}

export default function CanvasMarkers({ markers }: CanvasMarkersProps) {
  const map = useMap()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ciLayerRef = useRef<any>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!ciLayerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createLayer = (window as any).L.canvasIconLayer || (L as any).canvasIconLayer
      ciLayerRef.current = createLayer({}).addTo(map)
    }

    const layer = ciLayerRef.current

    // Remove old markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(m => layer.removeMarker(m, false))
    }

    // Create new markers
    const newMarkers = markers.map((m) => {
      const marker = L.marker(m.position, { icon: m.icon }) as ExtendedMarker
      if (m.onClick) {
        marker.on('click', m.onClick)
        marker._originalOnClick = m.onClick
      }
      return marker
    })

    if (newMarkers.length > 0) {
      layer.addLayers(newMarkers)
    }
    markersRef.current = newMarkers

    return () => {
      if (ciLayerRef.current && markersRef.current.length > 0) {
        markersRef.current.forEach(m => {
          if ((m as ExtendedMarker)._originalOnClick) m.off('click', (m as ExtendedMarker)._originalOnClick)
          ciLayerRef.current.removeMarker(m, false)
        })
        ciLayerRef.current.redraw()
        markersRef.current = []
      }
    }
  }, [map, markers])

  // Clean up layer on unmount
  useEffect(() => {
    return () => {
      if (ciLayerRef.current) {
        map.removeLayer(ciLayerRef.current)
        ciLayerRef.current = null
      }
    }
  }, [map])

  return null
}

