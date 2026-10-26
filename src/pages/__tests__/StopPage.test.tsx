import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import StopPage from '@/pages/StopPage'
import { api, ApiHttpError, type Arrival } from '@/api/client'

vi.mock('@/api/client', () => ({
  ApiHttpError: class ApiHttpError extends Error {
    status: number
    constructor(_path: string, status: number, _text: string) {
      super(`HTTP ${status}`)
      this.status = status
    }
  },
  api: {
    stops: {
      detail: vi.fn(),
      arrivals: vi.fn().mockResolvedValue({ data: [], headers: new Headers() }),
      routes: vi.fn().mockResolvedValue([]),
      announcements: vi.fn().mockResolvedValue([]),
    },
    routes: {
      announcements: vi.fn().mockResolvedValue([]),
    },
    notices: {
      global: vi.fn().mockResolvedValue([]),
      official: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    },
  },
}))

const createMockArrival = (overrides: Partial<Arrival> = {}): Arrival => ({
  route_code: '15TY',
  destination: 'Test Dest',
  eta_minutes: 5,
  eta_raw: '5 dk',
  plate: null,
  kapino: null,
  lat: null,
  lon: null,
  speed_kmh: null,
  last_seen_ts: null,
  amenities: null,
  ...overrides,
})

describe('StopPage Announcements', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  function renderPage(dcode = '1234') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/stops/${dcode}`]}>
          <Routes>
            <Route path="/stops/:dcode" element={<StopPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('fetches announcements for all routes at the stop and renders accordion', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234', name: 'Test Stop', latitude: 41, longitude: 29
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue({
      data: [
        createMockArrival({ route_code: '15TY', eta_minutes: 5 }),
        createMockArrival({ route_code: '11H', eta_minutes: 15 }),
      ],
      headers: new Headers(),
    })

    vi.mocked(api.stops.announcements).mockResolvedValue([
      { type: 'Duyuru', updated_at: '2026-06-05', message: '15TY is delayed', route_code: '15TY', route_name: '' },
      { type: 'Bilgi', updated_at: '2026-06-05', message: '11H extra bus added', route_code: '11H', route_name: '' }
    ])

    renderPage()

    // Wait for the accordion button to appear (2 announcements)
    const btn = await screen.findByRole('button', { name: /Duyurular \(2\)/i })
    expect(btn).toBeInTheDocument()

    // Expand accordion
    fireEvent.click(btn)

    // Verify announcements are rendered
    await waitFor(() => {
      expect(screen.getByText(/15TY is delayed/i)).toBeInTheDocument()
      expect(screen.getByText(/11H extra bus added/i)).toBeInTheDocument()
    })
  })

  it('shows error banner when announcement fetch fails', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234',
      name: 'Test Stop',
      direction: 'North',
      latitude: 41,
      longitude: 29
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue({
      data: [
        createMockArrival({ route_code: '15TY', eta_minutes: 5 }),
        createMockArrival({ route_code: '11H', eta_minutes: 15 }),
      ],
      headers: new Headers(),
    })
    vi.mocked(api.stops.routes).mockResolvedValue(['15TY', '11H'])

    // Fails
    vi.mocked(api.stops.announcements).mockRejectedValue(new Error('API Error'))

    renderPage()

    // Verify error banner is displayed
    await waitFor(() => {
      expect(screen.getByText(/Duyurular yüklenirken geçici bir hata oluştu/i)).toBeInTheDocument()
    })
  })

  it('shows empty banner when there are no announcements', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234',
      name: 'Test Stop',
      latitude: 41,
      longitude: 29
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue({ data: [], headers: new Headers() })
    vi.mocked(api.stops.announcements).mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Aktif duyuru yok/i)).toBeInTheDocument()
    })
  })

  it('renders not found when detail throws 404', async () => {
    // Return a mock error with status 404
    vi.mocked(api.stops.detail).mockRejectedValue(new ApiHttpError('/v1/stops/1234', 404, 'Not Found'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Durak Bulunamadı')).toBeInTheDocument()
      expect(screen.getByText('Ana Sayfaya Dön')).toBeInTheDocument()
    })
  })

  it('renders in kiosk mode without back button, refresh button or action buttons', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234',
      name: 'Kiosk Test Stop',
      latitude: 41,
      longitude: 29,
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue({
      data: [createMockArrival({ route_code: '500T', destination: 'Cevizlibağ' })],
      headers: new Headers(),
    })
    vi.mocked(api.stops.announcements).mockResolvedValue([])

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/stops/1234?kiosk=1']}>
          <Routes>
            <Route path="/stops/:dcode" element={<StopPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Kiosk Test Stop')).toBeInTheDocument()
    })

    // Back button and directions/info/pin buttons should not exist
    expect(screen.queryByLabelText(/Yol Tarifi Al/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Durak Bilgisi/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Yenile/i)).not.toBeInTheDocument()

    // Arrival route 500T should be rendered as a non-link div
    const routeCode = screen.getByText('500T')
    expect(routeCode.closest('a')).toBeNull()
  })

  it('renders sliding announcement card in kiosk mode with counter', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234',
      name: 'Kiosk Test Stop',
      latitude: 41,
      longitude: 29,
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue({
      data: [createMockArrival({ route_code: '500T', destination: 'Cevizlibağ' })],
      headers: new Headers(),
    })
    vi.mocked(api.stops.announcements).mockResolvedValue([
      { type: 'Duyuru', updated_at: '2026-10-26', message: '500T detour active', route_code: '500T', route_name: '' },
      { type: 'Bilgi', updated_at: '2026-10-26', message: 'Winter schedule in effect', route_code: 'GENEL', route_name: '' },
    ])

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/stops/1234?kiosk=1']}>
          <Routes>
            <Route path="/stops/:dcode" element={<StopPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Duyuru \(1\/2\)/i)).toBeInTheDocument()
      expect(screen.getByText(/500T detour active/i)).toBeInTheDocument()
    })
  })
})
