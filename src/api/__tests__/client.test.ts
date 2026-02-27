import { describe, it, expect, vi, afterEach } from 'vitest'
import { api } from '@/api/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200) {
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(String(body)),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// api.fleet
// ---------------------------------------------------------------------------

describe('api.fleet.all', () => {
  it('returns bus list on 200', async () => {
    const payload = [{ kapino: 'A-001', latitude: 41.0, longitude: 29.0 }]
    mockFetch(payload)
    const result = await api.fleet.all()
    expect(result).toEqual(payload)
  })

  it('throws on non-200 response', async () => {
    mockFetch('Internal Server Error', 500)
    await expect(api.fleet.all()).rejects.toThrow('HTTP 500')
  })
})

describe('api.fleet.meta', () => {
  it('returns bus_count and updated_at', async () => {
    mockFetch({ bus_count: 42, updated_at: null })
    const meta = await api.fleet.meta()
    expect(meta.bus_count).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// api.stops
// ---------------------------------------------------------------------------

describe('api.stops.search', () => {
  it('returns stop list', async () => {
    const payload = [{ dcode: '220602', name: 'AHMET MİTHAT EFENDİ', path: null }]
    mockFetch(payload)
    const result = await api.stops.search('ahmet')
    expect(result[0].dcode).toBe('220602')
  })

  it('url encodes the query', async () => {
    mockFetch([])
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)
    await api.stops.search('ahmet mithat')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('ahmet%20mithat')
  })
})

describe('api.stops.nearby', () => {
  it('includes lat/lon/radius in url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)
    await api.stops.nearby(41.08, 29.01, 300)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('lat=41.08')
    expect(url).toContain('lon=29.01')
    expect(url).toContain('radius=300')
  })

  it('returns nearby stops', async () => {
    const payload = [{ stop_code: '301341', stop_name: '4.LEVENT METRO', latitude: 41.08, longitude: 29.0, district: 'Şişli', distance_m: 120 }]
    mockFetch(payload)
    const result = await api.stops.nearby(41.08, 29.0)
    expect(result[0].stop_code).toBe('301341')
  })
})

describe('api.stops.arrivals', () => {
  it('returns arrivals list', async () => {
    const payload = [{ route_code: '500T', destination: 'LEVENT', eta_minutes: 4, eta_raw: '4 dk', plate: null, kapino: null }]
    mockFetch(payload)
    const result = await api.stops.arrivals('220602')
    expect(result[0].route_code).toBe('500T')
  })

  it('appends via param when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)
    await api.stops.arrivals('220602', '301341')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('via=301341')
  })
})

// ---------------------------------------------------------------------------
// api.routes
// ---------------------------------------------------------------------------

describe('api.routes.search', () => {
  it('returns route list', async () => {
    mockFetch([{ hat_kodu: '500T', name: 'TUZLA - LEVENT' }])
    const result = await api.routes.search('500T')
    expect(result[0].hat_kodu).toBe('500T')
  })
})

describe('api.routes.schedule', () => {
  it('returns schedule list', async () => {
    const payload = [{ route_code: '500T', route_name: 'X', route_variant: 'V', direction: 'D', day_type: 'H', service_type: 'X', departure_time: '05:55' }]
    mockFetch(payload)
    const result = await api.routes.schedule('500T')
    expect(result[0].departure_time).toBe('05:55')
  })
})

// ---------------------------------------------------------------------------
// api.garages
// ---------------------------------------------------------------------------

describe('api.garages.list', () => {
  it('returns garage list', async () => {
    mockFetch([{ code: 'IKT', name: 'IKITELLI GARAJ', latitude: 41.06, longitude: 28.80 }])
    const result = await api.garages.list()
    expect(result[0].name).toBe('IKITELLI GARAJ')
  })
})
