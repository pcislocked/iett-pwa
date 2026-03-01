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

// ---------------------------------------------------------------------------
// api.fleet — byPlate, detail, refresh
// ---------------------------------------------------------------------------

describe('api.fleet.byPlate', () => {
  it('returns single bus', async () => {
    const payload = { kapino: 'A-001', latitude: 41.0, longitude: 29.0 }
    mockFetch(payload)
    const result = await api.fleet.byPlate('A-001')
    expect(result.kapino).toBe('A-001')
  })

  it('url-encodes the kapino', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    await api.fleet.byPlate('A-001 X')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('A-001%20X')
  })

  it('throws on 404', async () => {
    mockFetch('Not Found', 404)
    await expect(api.fleet.byPlate('GHOST')).rejects.toThrow('HTTP 404')
  })
})

describe('api.fleet.detail', () => {
  it('returns BusDetail with route_is_live', async () => {
    const payload = { kapino: 'A-001', latitude: 41.0, longitude: 29.0,
                      resolved_route_code: '500T', route_is_live: true, route_stops: [] }
    mockFetch(payload)
    const result = await api.fleet.detail('A-001')
    expect(result.route_is_live).toBe(true)
    expect(result.resolved_route_code).toBe('500T')
  })

  it('returns route_is_live false for parked bus', async () => {
    const payload = { kapino: 'A-001', latitude: 41.0, longitude: 29.0,
                      resolved_route_code: '15F', route_is_live: false, route_stops: [] }
    mockFetch(payload)
    const result = await api.fleet.detail('A-001')
    expect(result.route_is_live).toBe(false)
  })

  it('throws on 404', async () => {
    mockFetch('Not Found', 404)
    await expect(api.fleet.detail('GHOST')).rejects.toThrow('HTTP 404')
  })
})

describe('api.fleet.refresh', () => {
  it('calls POST /v1/fleet/refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    await api.fleet.refresh()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/fleet/refresh'), expect.objectContaining({ method: 'POST' }))
  })
})

// ---------------------------------------------------------------------------
// api.stops — detail, routes
// ---------------------------------------------------------------------------

describe('api.stops.detail', () => {
  it('returns stop detail', async () => {
    mockFetch({ dcode: '220602', name: 'AHMET MİTHAT EFENDİ', latitude: 41.12, longitude: 29.08 })
    const result = await api.stops.detail('220602')
    expect(result.dcode).toBe('220602')
  })

  it('throws on 404', async () => {
    mockFetch('Not Found', 404)
    await expect(api.stops.detail('000000')).rejects.toThrow('HTTP 404')
  })
})

describe('api.stops.routes', () => {
  it('returns route code list', async () => {
    mockFetch(['500T', '15F'])
    const result = await api.stops.routes('301341')
    expect(result).toContain('500T')
  })
})

// ---------------------------------------------------------------------------
// api.routes — metadata, buses, stops, announcements
// ---------------------------------------------------------------------------

describe('api.routes.metadata', () => {
  it('returns metadata array', async () => {
    const payload = [{ hat_kodu: '500T', direction_name: 'LEVENT', full_name: '500T - LEVENT',
                       variant_code: '500T_D_D0', direction: 0, depar_no: 1 }]
    mockFetch(payload)
    const result = await api.routes.metadata('500T')
    expect(result[0].variant_code).toBe('500T_D_D0')
  })
})

describe('api.routes.buses', () => {
  it('returns bus list', async () => {
    mockFetch([{ kapino: 'A-001', latitude: 41.0, longitude: 29.0 }])
    const result = await api.routes.buses('500T')
    expect(result[0].kapino).toBe('A-001')
  })
})

describe('api.routes.stops', () => {
  it('returns stop list', async () => {
    const payload = [{ route_code: '500T', direction: 'G', sequence: 1,
                       stop_code: '301341', stop_name: 'LEVENT', latitude: 41.08, longitude: 29.01, district: null }]
    mockFetch(payload)
    const result = await api.routes.stops('500T')
    expect(result[0].stop_code).toBe('301341')
  })
})

describe('api.routes.announcements', () => {
  it('returns announcements', async () => {
    mockFetch([{ route_code: '500T', route_name: 'X', type: 'Günlük', updated_at: '09:00', message: 'Test' }])
    const result = await api.routes.announcements('500T')
    expect(result[0].route_code).toBe('500T')
  })
})

// ---------------------------------------------------------------------------
// api.traffic
// ---------------------------------------------------------------------------

describe('api.traffic.index', () => {
  it('returns traffic index', async () => {
    mockFetch({ percent: 45, description: 'Moderate' })
    const result = await api.traffic.index()
    expect(result.description).toBe('Moderate')
  })
})

describe('api.traffic.segments', () => {
  it('returns segment list', async () => {
    mockFetch([{ segment_id: '1', speed_kmh: 40, congestion: 3, timestamp: '2026-03-02' }])
    const result = await api.traffic.segments()
    expect(result[0].speed_kmh).toBe(40)
  })
})
