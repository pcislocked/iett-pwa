/**
 * Typed API client for iett-middle REST endpoints.
 * Base URL is read from VITE_API_BASE_URL env var (defaults to same origin).
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${path} → HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Model types ──────────────────────────────────────────────────────────────

export interface TrailPoint {
  lat: number
  lon: number
  ts: string
}

export interface BusPosition {
  kapino: string
  plate: string | null
  latitude: number
  longitude: number
  speed: number | null
  operator: string | null
  last_seen: string
  route_code: string | null
  route_name: string | null
  direction: string | null        // terminal name, e.g. "YENİ CAMİİ"
  direction_letter: string | null // "G" or "D"
  nearest_stop: string | null
  trail: TrailPoint[]
}

export interface Amenities {
  usb: boolean | null
  wifi: boolean | null
  ac: boolean | null
  accessible: boolean | null
}

export interface Arrival {
  route_code: string
  destination: string
  eta_minutes: number | null
  eta_raw: string
  plate: string | null
  kapino: string | null
  /** Live position from ntcapi ybs — null when sourced from IETT HTML fallback */
  lat: number | null
  lon: number | null
  /** Speed in km/h from ntcapi ybs — null when sourced from IETT HTML fallback */
  speed_kmh: number | null
  last_seen_ts: string | null
  /** Amenity flags — null when source does not provide them */
  amenities: Amenities | null
}

export interface StopSearchResult {
  dcode: string
  name: string
  path: string | null
}

export interface StopDetail {
  dcode: string
  name: string
  latitude: number | null
  longitude: number | null
  direction?: string | null
}

export interface NearbyStop {
  stop_code: string
  stop_name: string
  latitude: number
  longitude: number
  district: string | null
  direction?: string | null
  distance_m: number
}

export interface RouteSearchResult {
  hat_kodu: string
  name: string
}

export interface RouteMetadata {
  hat_kodu: string
  direction_name: string
  full_name: string
  variant_code: string
  direction: number
  depar_no: number
}

export interface RouteStop {
  route_code: string
  direction: string
  sequence: number
  stop_code: string
  stop_name: string
  latitude: number
  longitude: number
  district: string | null
}

export interface ScheduledDeparture {
  route_code: string
  route_name: string
  route_variant: string
  direction: string
  day_type: string
  service_type: string
  departure_time: string
}

export interface Announcement {
  route_code: string
  route_name: string
  type: string
  updated_at: string
  message: string
}

export interface Garage {
  code: string | null
  name: string
  latitude: number
  longitude: number
}

export interface TrafficIndex {
  index: number
  description: string
  fetched_at: string
}

export interface TrafficSegment {
  segment_id: string
  speed_kmh: number
  congestion: number
  timestamp: string
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  fleet: {
    all: () => get<BusPosition[]>('/v1/fleet'),
    byPlate: (kapino: string) => get<BusPosition>(`/v1/fleet/${encodeURIComponent(kapino)}`),
    meta: () => get<{ bus_count: number; updated_at: string | null }>('/v1/fleet/meta'),
    refresh: () =>
      fetch(`${BASE}/v1/fleet/refresh`, { method: 'POST' }).then((r) => r.json()),
  },
  stops: {
    search: (q: string) => get<StopSearchResult[]>(`/v1/stops/search?q=${encodeURIComponent(q)}`),
    nearby: (lat: number, lon: number, radius = 500) =>
      get<NearbyStop[]>(`/v1/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
    detail: (dcode: string) => get<StopDetail>(`/v1/stops/${encodeURIComponent(dcode)}`),
    arrivals: (dcode: string, via?: string) =>
      get<Arrival[]>(`/v1/stops/${dcode}/arrivals${via ? `?via=${via}` : ''}`),
    routes: (dcode: string) => get<string[]>(`/v1/stops/${dcode}/routes`),
  },
  routes: {
    search: (q: string) => get<RouteSearchResult[]>(`/v1/routes/search?q=${encodeURIComponent(q)}`),
    metadata: (hatKodu: string) => get<RouteMetadata[]>(`/v1/routes/${hatKodu}`),
    buses: (hatKodu: string) => get<BusPosition[]>(`/v1/routes/${hatKodu}/buses`),
    stops: (hatKodu: string) => get<RouteStop[]>(`/v1/routes/${hatKodu}/stops`),
    schedule: (hatKodu: string) => get<ScheduledDeparture[]>(`/v1/routes/${hatKodu}/schedule`),
    announcements: (hatKodu: string) => get<Announcement[]>(`/v1/routes/${hatKodu}/announcements`),
  },
  garages: {
    list: () => get<Garage[]>('/v1/garages'),
  },
  traffic: {
    index: () => get<TrafficIndex>('/v1/traffic/index'),
    segments: () => get<TrafficSegment[]>('/v1/traffic/segments'),
  },
}
