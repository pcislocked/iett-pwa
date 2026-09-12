import { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'

export const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

export const TILE_ATTRIBUTION = {
  carto: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
  satellite: 'Tiles &copy; Esri &mdash; Source: Esri',
}

export function useMapTiles() {
  const { theme } = useTheme()
  const [satellite, setSatellite] = useState(() => {
    return localStorage.getItem('map-satellite') === '1'
  })

  const toggleSatellite = useCallback(() => {
    setSatellite((s) => {
      const next = !s
      localStorage.setItem('map-satellite', next ? '1' : '0')
      return next
    })
  }, [])

  const currentUrl = satellite
    ? TILE_URLS.satellite
    : theme === 'light'
      ? TILE_URLS.light
      : TILE_URLS.dark

  const currentAttribution = satellite ? TILE_ATTRIBUTION.satellite : TILE_ATTRIBUTION.carto

  return { currentUrl, currentAttribution, satellite, toggleSatellite }
}
