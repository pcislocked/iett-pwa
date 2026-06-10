import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet-canvas-marker'

interface CanvasMarkersProps {
  markers: {
    position: [number, number]
    icon: L.Icon | L.DivIcon
    onClick?: (e: any) => void
  }[]
}

export default function CanvasMarkers({ markers }: CanvasMarkersProps) {
  const map = useMap()
  const ciLayerRef = useRef<any>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!ciLayerRef.current) {
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
      const marker = L.marker(m.position, { icon: m.icon })
      if (m.onClick) {
        marker.on('click', m.onClick)
        // @ts-ignore
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
          // @ts-ignore
          if (m._originalOnClick) m.off('click', m._originalOnClick)
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

