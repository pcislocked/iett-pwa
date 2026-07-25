/**
 * Typed API client for iett-middle REST endpoints.
 * Base URL is resolved from user settings first, then VITE_API_BASE_URL,
 * then same origin as a final fallback.
 */

import { loadSettings } from '@/utils/settings'

const STATIC_BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL ?? '')
const REQUEST_TIMEOUT_MS = 30_000
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
  if (error instanceof TypeError) return true
  if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) return true
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) return true
  return false
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

async function requestFull<T>(path: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const configuredBase = getConfiguredBase()

  const execute = async (url: string): Promise<{ data: T; headers: Headers }> => {
    const { signal: timeoutSignal, clear } = createTimeoutSignal(REQUEST_TIMEOUT_MS)
    try {
      let finalSignal = init?.signal || timeoutSignal
      if (init?.signal && timeoutSignal && typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
        finalSignal = AbortSignal.any([init.signal, timeoutSignal])
      }

      const requestInit = finalSignal ? { ...init, signal: finalSignal } : init
      const res = await fetch(url, requestInit)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new ApiHttpError(path, res.status, text)
      }
      return { data: await res.json() as T, headers: res.headers }
    } finally {
      clear()
    }
  }

  try {
    try {
      return await execute(`${configuredBase}${path}`)
    } catch (error) {
      if (configuredBase && isNetworkError(error)) {
        return await execute(path)
      }
      throw error
    }
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(NETWORK_ERROR_TEXT, { cause: error })
    }
    throw error
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await requestFull<T>(path, init)
  return data
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


export interface GlobalNotice {
  notice_body: string
  notice_endtime: number
  notice_imageid: string | null
  notice_noticeid: string
  notice_starttime: number
  notice_title: string
  page_name: string
  page_pageid: string
}

// ─── API Response Wrappers ──────────────────────────────────────────────────────────────

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
  trail?: TrailPoint[]
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
  usb?: boolean | null
  wifi?: boolean | null
  ac?: boolean | null
  accessible?: boolean | null
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
  official_note_id?: string | null
}

export interface Announcement {
  route_code: string
  route_name: string
  type: string
  updated_at: string
  message: string
}

export interface RouteAnnouncement extends Announcement {
  route_code: string
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
  suggestedAnswer: string | null
}

export interface AracSessionCreateRequest {
  captchaId: string
  captchaAnswer: string
  kapino: string
}

export interface AracSessionCreateResponse {
  sessionId: string
  sessionKey: string
}

export interface AracMissionItem {
  line_code: string | null
  first_stop: string | null
  departure_time: string | null
  state: string | null
}

export interface AracMissionSummary {
  mission_count: number
  completed_count: number
  pending_count: number
  distinct_line_codes: string[]
}

export interface AracMissionsResponse {
  kapino: string
  summary: AracMissionSummary
  missions: AracMissionItem[]
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  fleet: {
    all: (init?: RequestInit) => get<BusPosition[]>('/v1/fleet', init),
    byPlate: (kapino: string, init?: RequestInit) => get<BusPosition>(`/v1/fleet/${encodeURIComponent(kapino)}`, init),
    detail: (kapino: string, init?: RequestInit) => get<BusDetail>(`/v1/fleet/${encodeURIComponent(kapino)}/detail`, init),
    meta: (init?: RequestInit) => get<{ bus_count: number; updated_at: string | null }>('/v1/fleet/meta', init),
    refresh: (init?: RequestInit) => post<FleetRefreshResponse>('/v1/fleet/refresh', undefined, init),
  },
  stops: {
    search: async (q: string, init?: RequestInit) => get<StopSearchResult[]>(`/v1/stops/search?q=${encodeURIComponent(q)}`, init),
    nearby: async (lat: number, lon: number, limit: number = 15, radius: number = 500, init?: RequestInit) =>
      get<NearbyStop[]>(`/v1/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`, init),
    detail: async (dcode: string, init?: RequestInit) => get<StopDetail>(`/v1/stops/${encodeURIComponent(dcode)}`, init),
    arrivals: async (dcode: string, via?: string, init?: RequestInit) => {
      const q = new URLSearchParams()
      if (via) q.set('via', via)
      const qs = q.toString()
      return requestFull<Arrival[]>(`/v1/stops/${encodeURIComponent(dcode)}/arrivals${qs ? `?${qs}` : ''}`, init)
    },
    routes: async (dcode: string, init?: RequestInit) => get<string[]>(`/v1/stops/${encodeURIComponent(dcode)}/routes`, init),
    announcements: (dcode: string, init?: RequestInit) => get<RouteAnnouncement[]>(`/v1/stops/${dcode}/announcements`, init),
  },
  routes: {
    search: (q: string, init?: RequestInit) => get<RouteSearchResult[]>(`/v1/routes/search?q=${encodeURIComponent(q)}`, init),
    metadata: (hatKodu: string, init?: RequestInit) => get<RouteMetadata[]>(`/v1/routes/${hatKodu}`, init),
    buses: (hatKodu: string, init?: RequestInit) => get<BusPosition[]>(`/v1/routes/${hatKodu}/buses`, init),
    stops: (hatKodu: string, init?: RequestInit) => get<RouteStop[]>(`/v1/routes/${hatKodu}/stops`, init),
    schedule: (hatKodu: string, init?: RequestInit) => get<ScheduledDeparture[]>(`/v1/routes/${hatKodu}/schedule`, init),
    scheduleLite: (hatKodu: string, init?: RequestInit) => get<ScheduledDeparture[]>(`/v1/routes/${hatKodu}/schedule?lite=1`, init),
    announcements: (hatKodu: string, init?: RequestInit) => get<Announcement[]>(`/v1/routes/${hatKodu}/announcements`, init),
    batchAnnouncements: (routes: string[], init?: RequestInit) => get<RouteAnnouncement[]>(`/v1/routes/announcements/batch?routes=${encodeURIComponent(routes.join(','))}`, init),
  },
  garages: {
    list: (init?: RequestInit) => get<Garage[]>('/v1/garages', init),
  },
  traffic: {
    index: (init?: RequestInit) => get<TrafficIndex>('/v1/traffic/index', init),
    segments: (init?: RequestInit) => get<TrafficSegment[]>('/v1/traffic/segments', init),
  },
  arac: {
    captcha: (init?: RequestInit) => post<AracCaptchaResponse>('/v1/arac/session/captcha', undefined, init),
    createSession: (payload: AracSessionCreateRequest, init?: RequestInit) =>
      post<AracSessionCreateResponse>('/v1/arac/session/create', payload, init),
    detail: (kapino: string, session: AracSessionCredentials, init?: RequestInit) =>
      get<{ profile: BusPosition; missions: AracMissionsResponse }>(`/v1/arac/fleet/${encodeURIComponent(kapino)}/detail`, {
        ...init, headers: { ...init?.headers, 'X-Arac-Session-Key': session.sessionKey },
      }),
  },
  notices: {
    global: (init?: RequestInit) => get<GlobalNotice[]>('/v1/announcements/global', init),
  }
}
