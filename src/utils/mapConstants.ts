import * as L from 'leaflet'

/**
 * Greater Istanbul bounding box:
 * Southwest: [40.70, 28.20] (Silivri / South Marmara)
 * Northeast: [41.60, 29.90] (Şile / Black Sea Coast)
 */
export const ISTANBUL_BOUNDS = L.latLngBounds(
  L.latLng(40.70, 28.20),
  L.latLng(41.60, 29.90),
)

export const ISTANBUL_CENTER: [number, number] = [41.0082, 28.9784]

export const MAP_MIN_ZOOM = 9
export const MAP_MAX_ZOOM = 18
