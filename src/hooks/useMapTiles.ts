import { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'

export const TILE_URLS = {
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

export const TILE_ATTRIBUTION = {
  esri: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  satellite: 'Tiles &copy; Esri &mdash; Source: Esri',
}

export function useMapTiles() {
  const { theme } = useTheme()
  const [satellite, setSatellite] = useState(() => {
    return localStorage.getItem('map-satellite') === '1' || localStorage.getItem('iett_satellite') === 'true'
  })

  const toggleSatellite = useCallback(() => {
    setSatellite((s) => {
      const next = !s
      localStorage.setItem('map-satellite', next ? '1' : '0')
      localStorage.setItem('iett_satellite', String(next))
      return next
    })
  }, [])

  const currentUrl = satellite
    ? TILE_URLS.satellite
    : theme === 'light'
      ? TILE_URLS.light
      : TILE_URLS.dark

  const currentAttribution = satellite ? TILE_ATTRIBUTION.satellite : TILE_ATTRIBUTION.esri

  const mapClassName = satellite ? 'map-satellite' : 'map-base'
  const tileClassName = satellite ? 'leaflet-tiles-satellite' : 'leaflet-tiles-base'

  return { currentUrl, currentAttribution, satellite, toggleSatellite, mapClassName, tileClassName }
}
