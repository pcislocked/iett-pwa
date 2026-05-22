import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RoutePage from '@/pages/RoutePage'

// Mock the polling hooks to supply synchronous test data
const mocks = vi.hoisted(() => ({
  useRouteBuses: vi.fn(() => ({ data: [], stale: false })),
  usePolling: vi.fn(),
  useFavorites: vi.fn(() => ({ isFavorite: () => false, toggle: vi.fn() })),
}))

vi.mock('@/hooks/useFleet', () => ({ useRouteBuses: mocks.useRouteBuses }))
vi.mock('@/hooks/usePolling', () => ({ usePolling: mocks.usePolling }))
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: mocks.useFavorites }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div />,
  Marker: ({ children }: any) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  CircleMarker: ({ eventHandlers }: any) => <div data-testid="circle-marker" onClick={eventHandlers.click} />,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('RoutePage', () => {
  function renderPage(entry = '/routes/15TY') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/routes/:hatKodu" element={<RoutePage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  function setupMocks(options: any = {}) {
    mocks.useFavorites.mockReturnValue({
      isFavorite: () => options.isFav || false,
      toggle: vi.fn(),
    })

    mocks.useRouteBuses.mockReturnValue({
      data: options.buses || [
        { kapino: 'B123', latitude: 41.0, longitude: 29.0, direction_letter: 'G', direction: 'Gidiş', stop_sequence: 1 },
        { kapino: 'B456', latitude: 41.1, longitude: 29.1, direction_letter: 'D', direction: 'Dönüş', stop_sequence: 2 },
      ],
      stale: false,
    })

    mocks.usePolling.mockImplementation((fetcher: any) => {
      const fetcherString = fetcher.toString()
      if (fetcherString.includes('stops')) {
        return {
          data: options.stops !== undefined ? options.stops : [
            { stop_code: '1001', stop_name: 'Test Stop 1', direction: 'G', sequence: 1, latitude: 41.0, longitude: 29.0 },
            { stop_code: '1002', stop_name: 'Test Stop 2', direction: 'D', sequence: 2, latitude: 41.1, longitude: 29.1 },
          ],
          error: options.stopsError || null,
        }
      }
      if (fetcherString.includes('schedule')) {
        return {
          data: options.schedule !== undefined ? options.schedule : [
            { route_variant: '15TY_G_D0', day_type: 'H', direction: 'G', departure_time: '10:00' },
            { route_variant: '15TY_G_D2449', day_type: 'H', direction: 'G', departure_time: '10:30' },
            { route_variant: '15TY_G_D1234', day_type: 'H', direction: 'G', departure_time: '11:00' },
            { route_variant: '15TY_D_D0', day_type: 'H', direction: 'D', departure_time: '12:00' },
          ],
          error: options.scheduleError || null,
        }
      }
      if (fetcherString.includes('announcements')) {
        return {
          data: options.announcements !== undefined ? options.announcements : [
            { type: 'Info', updated_at: '10:00', message: 'Test announcement' },
          ],
          error: options.announcementsError || null,
        }
      }
      if (fetcherString.includes('metadata')) {
        return {
          data: options.metadata !== undefined ? options.metadata : [
            {
              direction: 0,
              direction_name: 'TOKATKÖY - HEKİMBAŞI',
              variant_code: '15TY_G_D0',
              full_name: 'TOKATKÖY - HEKİMBAŞI',
            },
            {
              direction: 0,
              direction_name: 'TOKATKÖY - YENİ MAHALLE',
              variant_code: '15TY_G_D2449',
              full_name: 'TOKATKÖY - YENİ MAHALLE',
            },
            {
              direction: 0,
              direction_name: 'TOKATKÖY - ÇAVUŞBAŞI',
              variant_code: '15TY_G_D1234',
              full_name: 'TOKATKÖY - ÇAVUŞBAŞI',
            }
          ]
        }
      }
      return { data: null }
    })
  }

  it('renders dynamic footnotes for sub-routes and descriptive direction labels', async () => {
    setupMocks()
    renderPage()

    expect(screen.getByText('TOKATKÖY KALKIŞ')).toBeInTheDocument()
    fireEvent.click(screen.getByText('TOKATKÖY KALKIŞ'))

    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    
    expect(screen.getByText('Notlar (Yan Seferler)')).toBeInTheDocument()
    expect(screen.getByText('TOKATKÖY - ÇAVUŞBAŞI')).toBeInTheDocument()
    expect(screen.getByText('TOKATKÖY - YENİ MAHALLE')).toBeInTheDocument()
  })

  it('toggles favorite on button click', () => {
    setupMocks()
    renderPage()
    
    const buttons = screen.getAllByRole('button')
    // The favorite button is the first button in the header
    fireEvent.click(buttons[0])
    expect(mocks.useFavorites().toggle).toHaveBeenCalledWith({ kind: 'route', hat_kodu: '15TY', name: 'TOKATKÖY - HEKİMBAŞI' })
  })

  it('renders map tab correctly', () => {
    setupMocks()
    renderPage()
    
    fireEvent.click(screen.getByText('Harita'))
    
    // Check map container
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    
    // Check direction filter pills on map
    const dirButtons = screen.getAllByRole('button', { name: 'Dönüş' })
    fireEvent.click(dirButtons[0]) // The pill button
    
    // Check buses
    expect(screen.getAllByText('Gidiş').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dönüş').length).toBeGreaterThan(0)
    
    // Click circle marker
    const circleMarkers = screen.getAllByTestId('circle-marker')
    fireEvent.click(circleMarkers[0])
  })

  it('renders stops tab correctly', () => {
    setupMocks()
    renderPage()
    
    fireEvent.click(screen.getByText('Duraklar'))
    
    // Since 'D' comes before 'G', 'D' is the default active direction, so Test Stop 2 is visible
    expect(screen.getByText('Test Stop 2')).toBeInTheDocument()
    
    // Click 'HEKİMBAŞI YÖNÜ' which corresponds to 'G'
    const dirButton = screen.getByRole('button', { name: 'HEKİMBAŞI YÖNÜ' })
    fireEvent.click(dirButton)
    
    expect(screen.getByText('Test Stop 1')).toBeInTheDocument()
  })

  it('shows error state for stops', () => {
    setupMocks({ stops: null, stopsError: 'Error' })
    renderPage()
    fireEvent.click(screen.getByText('Duraklar'))
    expect(screen.getByText('Durak listesi yüklenemedi')).toBeInTheDocument()
  })

  it('shows empty state for stops', () => {
    setupMocks({ stops: [] })
    renderPage()
    fireEvent.click(screen.getByText('Duraklar'))
    expect(screen.getByText('Bu hat için durak bulunamadı')).toBeInTheDocument()
  })

  it('renders alerts tab correctly', () => {
    setupMocks()
    renderPage()
    
    fireEvent.click(screen.getByText('Duyurular'))
    
    expect(screen.getByText('Test announcement')).toBeInTheDocument()
  })

  it('shows empty state for alerts', () => {
    setupMocks({ announcements: [] })
    renderPage()
    fireEvent.click(screen.getByText('Duyurular'))
    expect(screen.getByText('Aktif duyuru yok')).toBeInTheDocument()
  })

  it('shows error state for alerts', () => {
    setupMocks({ announcements: null, announcementsError: 'Error' })
    renderPage()
    fireEvent.click(screen.getByText('Duyurular'))
    expect(screen.getByText('Duyurular yüklenemedi')).toBeInTheDocument()
  })
})
