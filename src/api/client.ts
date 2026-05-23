/**
 * Typed API client for iett-middle REST endpoints.
 * Base URL is resolved from user settings first, then VITE_API_BASE_URL,
 * then same origin as a final fallback.
 */

import { loadSettings } from '@/utils/settings'

const STATIC_BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL ?? '')
const REQUEST_TIMEOUT_MS = 15_000
const NETWORK_ERROR_TEXT = 'Sunucuya baglanilamadi. Ayarlar > iett-middle Sunucu Adresi bolumunu kontrol edin.'

function normalizeBase(base: string | null | undefined): string {
  const trimmed = (base ?? '').trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/+$/, '')
}

function readRuntimeBase(): string {
  try {
    return normalizeBase(loadSettings().apiBase)
  } catch {
    return ''
  }
}

function getConfiguredBase(): string {
  return readRuntimeBase() || STATIC_BASE
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError
}

export class ApiHttpError extends Error {
  status: number
  path: string
  responseText: string

  constructor(path: string, status: number, responseText: string) {
    super(`API ${path} -> HTTP ${status}: ${responseText}`)
    this.name = 'ApiHttpError'
    this.status = status
    this.path = path
    this.responseText = responseText
  }
}

type TimeoutSignal = {
  signal?: AbortSignal
  clear: () => void
}

function createTimeoutSignal(timeoutMs: number): TimeoutSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(timeoutMs), clear: () => {} }
  }

  if (typeof AbortController === 'undefined') {
    return { signal: undefined, clear: () => {} }
  }

  const controller = new AbortController()
  const timerId = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timerId),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { signal, clear } = createTimeoutSignal(REQUEST_TIMEOUT_MS)
  try {
    const requestInit = signal ? { ...init, signal } : init
    const configuredBase = getConfiguredBase()

    const execute = async (url: string): Promise<T> => {
      const res = await fetch(url, requestInit)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new ApiHttpError(path, res.status, text)
      }
      const data = await res.json()
      const upstreamHeader = res.headers?.get?.("X-IETT-Updated-At")
      if (upstreamHeader && typeof data === 'object' && data !== null) {
        Object.defineProperty(data, '__iettUpdated', { value: new Date(upstreamHeader), enumerable: false })
      }
      return data as T
    }

    try {
      return await execute(`${configuredBase}${path}`)
    } catch (error) {
      // If an explicit base is unreachable, retry same-origin once.
      if (configuredBase && isNetworkError(error)) {
        return await execute(path)
      }
      throw error
    }
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(NETWORK_ERROR_TEXT)
    }
    throw error
  } finally {
    clear()
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init)
}

async function post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return request<T>(path, {
    ...init,
    method: 'POST',
    headers,
    body: body === undefined ? init?.body : JSON.stringify(body),
  })
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
  stop_sequence: number | null    // current stop index along the route
  operator_id?: number | null
  operator_name?: string | null
  vehicle_brand?: string | null
  model_year?: number | null
  vehicle_type?: string | null
  seating_capacity?: number | null
  full_capacity?: number | null
  accessible?: boolean | null
  has_usb?: boolean | null
  has_wifi?: boolean | null
  has_bicycle_rack?: boolean | null
  is_air_conditioned?: boolean | null
  garage_code?: string | null
  garage_name?: string | null
  vehicle_software_version?: number | null
  trail: TrailPoint[]
}

export interface BusDetail extends BusPosition {
  /** Best-guess route code: live route_code → last known since server start. */
  resolved_route_code: string | null
  /** True = bus currently serving this route. False = last known, bus currently inactive/parked. */
  route_is_live: boolean
  /** Ordered stop list for all directions — filter by direction to draw polyline. */
  route_stops: RouteStop[]
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
  hat_id?: number | null          // ntcapi internal numeric ID (for ybs point-passing)
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

export type FleetRefreshResponse =
  | { status: 'queued' }
  | { status: 'cooldown'; retry_after_seconds: number }

export interface AracSessionCredentials {
  sessionId: string
  sessionKey: string
}

export interface AracCaptchaResponse {
  captchaId: string
  captchaImageBase64: string
}

export interface AracSessionCreateRequest {
  captchaId: string
  captchaAnswer: string
}

export interface AracSessionCreateResponse {
  sessionId: string
  sessionKey: string
}

export interface AracMissionItem {
  task_id: number | null
  archive_id: number | null
  task_start_time_ms: number | null
  task_end_time_ms: number | null
  task_coming_time_ms: number | null
  line_code: string | null
  line_name: string | null
  route_code: string | null
  route_id: number | null
  route_direction: number | null
  service_no: number | null
  driver_register_no: string | null
  unread_message: boolean | null
  task_status: number | null
  task_status_code: string | null
  old_line_name: string | null
  superior_name: string | null
  bus_door_number: string | null
  driver_id: number | null
  vehicle_id: number | null
  line_id: number | null
  justification_id: number | null
  last_location_time_ms: number | null
  updated_by: string | null
  intervention_code: string | null
  note: string | null
  updated_time_ms: number | null
  updated_start_time_ms: number | null
  task_start_time: string | null
  task_end_time: string | null
  task_coming_time: string | null
  last_location_time: string | null
  updated_time: string | null
  updated_start_time: string | null
  approximate_start_time_ms: number | null
  approximate_end_time_ms: number | null
  approximate_start_time: string | null
  approximate_end_time: string | null
  is_active: boolean | null
  last_point_order_number: number | null
  task_type_id: number | null
  created_by: number | null
  last_stop_passed_code: string | null
  last_stop_passed_name: string | null
  stop_id: number | null
  stop_code: string | null
  stop_name: string | null
  sending_time_ms: number | null
  sending_time: string | null
  sending_time_old_ms: number | null
  sending_time_old: string | null
  has_plan_sent: boolean | null
  delivery_report_time_ms: number | null
  delivery_report_time: string | null
  gprs_active: boolean | null
}

export interface AracMissionSummary {
  mission_count: number
  active_count: number
  distinct_line_codes: string[]
  distinct_route_codes: string[]
}

export interface AracMissionsResponse {
  kapino: string
  summary: AracMissionSummary
  missions: AracMissionItem[]
}

function aracAuthHeaders(session: AracSessionCredentials): HeadersInit {
  return {
    'X-Arac-Session-Id': session.sessionId,
    'X-Arac-Session-Key': session.sessionKey,
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  fleet: {
    all: () => get<BusPosition[]>('/v1/fleet'),
    byPlate: (kapino: string) => get<BusPosition>(`/v1/fleet/${encodeURIComponent(kapino)}`),
    detail: (kapino: string) => get<BusDetail>(`/v1/fleet/${encodeURIComponent(kapino)}/detail`),
    meta: () => get<{ bus_count: number; updated_at: string | null }>('/v1/fleet/meta'),
    refresh: () => post<FleetRefreshResponse>('/v1/fleet/refresh'),
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
  arac: {
    captcha: () => post<AracCaptchaResponse>('/v1/arac/session/captcha'),
    createSession: (payload: AracSessionCreateRequest) =>
      post<AracSessionCreateResponse>('/v1/arac/session/create', payload),
    fleet: (session: AracSessionCredentials) =>
      get<BusPosition[]>('/v1/arac/fleet', { headers: aracAuthHeaders(session) }),
    bus: (kapino: string, session: AracSessionCredentials) =>
      get<BusPosition>(`/v1/arac/fleet/${encodeURIComponent(kapino)}`, {
        headers: aracAuthHeaders(session),
      }),
    missions: (kapino: string, session: AracSessionCredentials) =>
      get<AracMissionsResponse>(`/v1/arac/fleet/${encodeURIComponent(kapino)}/missions`, {
        headers: aracAuthHeaders(session),
      }),
  },
}
