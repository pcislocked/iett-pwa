import { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'

export const TILE_URLS = {
  light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

export const TILE_ATTRIBUTION = {
  light: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  dark: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
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

  const currentAttribution = satellite 
    ? TILE_ATTRIBUTION.satellite 
    : theme === 'light'
      ? TILE_ATTRIBUTION.light
      : TILE_ATTRIBUTION.dark

  return { currentUrl, currentAttribution, satellite, toggleSatellite }
}
