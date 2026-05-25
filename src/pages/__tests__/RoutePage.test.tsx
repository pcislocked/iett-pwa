/* eslint-disable @typescript-eslint/no-explicit-any */
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
  CircleMarker: ({ eventHandlers, children }: any) => <div data-testid="circle-marker" onClick={eventHandlers?.click}>{children}</div>,
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

    let callCount = 0
    mocks.usePolling.mockImplementation(() => {
      const index = callCount % 4
      callCount++
      
      if (index === 0) { // stops
        return {
          data: options.stops !== undefined ? options.stops : [
            { stop_code: '1001', stop_name: 'Test Stop 1', direction: 'G', sequence: 1, latitude: 41.0, longitude: 29.0, route_code: '15TY_G_D0' },
            { stop_code: '1002', stop_name: 'Test Stop 2', direction: 'D', sequence: 2, latitude: 41.1, longitude: 29.1, route_code: '15TY_G_D2449' },
          ],
          error: options.stopsError || null,
          refresh: vi.fn(),
        }
      }
      if (index === 1) { // schedule
        return {
          data: options.schedule !== undefined ? options.schedule : [
            { route_variant: '15TY_G_D0', day_type: 'H', direction: 'G', departure_time: '10:00' },
            { route_variant: '15TY_G_D2449', day_type: 'H', direction: 'G', departure_time: '10:30' },
            { route_variant: '15TY_G_D1234', day_type: 'H', direction: 'G', departure_time: '11:00' },
            { route_variant: '15TY_D_D0', day_type: 'H', direction: 'D', departure_time: '12:00' },
          ],
          error: options.scheduleError || null,
          refresh: vi.fn(),
        }
      }
      if (index === 2) { // announcements
        return {
          data: options.announcements !== undefined ? options.announcements : [
            { type: 'Info', updated_at: '10:00', message: 'Test announcement' },
          ],
          error: options.announcementsError || null,
          refresh: vi.fn(),
        }
      }
      if (index === 3) { // metadata
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
          ],
          refresh: vi.fn(),
        }
      }
      return { data: null, refresh: vi.fn() }
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
    expect(screen.getByText('TOKATKÖY > ÇAVUŞBAŞI (D1234)')).toBeInTheDocument()
    expect(screen.getByText('TOKATKÖY > YENİ MAHALLE (D2449)')).toBeInTheDocument()
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
    
    fireEvent.click(screen.getByRole('button', { name: /Harita/i }))
    
    // Check map container
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    
    // Change variant in custom dropdown
    fireEvent.click(screen.getByText('Tüm Seferler'))
    fireEvent.click(screen.getByText('TOKATKÖY > YENİ MAHALLE (D2449)'))
    
    // Check buses
    expect(screen.getAllByTestId('map-marker').length).toBeGreaterThan(0)
    
    // Switch to stops tabrker
    const circleMarkers = screen.getAllByTestId('circle-marker')
    fireEvent.click(circleMarkers[0])
  })

  it('renders stops tab correctly', () => {
    setupMocks()
    renderPage()
    
    fireEvent.click(screen.getByRole('button', { name: /Duraklar/i }))
    
    expect(screen.getByText('Test Stop 1')).toBeInTheDocument()
    
    // Change variant in custom dropdown
    fireEvent.click(screen.getAllByText('TOKATKÖY > HEKİMBAŞI')[0])
    fireEvent.click(screen.getByText('TOKATKÖY > YENİ MAHALLE (D2449)'))
    
    expect(screen.getByText('Test Stop 2')).toBeInTheDocument()
  })

  it('shows error state for stops', () => {
    setupMocks({ stops: null, stopsError: 'Error' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Duraklar/i }))
    expect(screen.getByText('Durak listesi yüklenemedi')).toBeInTheDocument()
  })

  it('shows empty state for stops', () => {
    setupMocks({ stops: [] })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Duraklar/i }))
    expect(screen.getByText('Bu hat için durak bulunamadı')).toBeInTheDocument()
  })

  it('renders alerts tab correctly', () => {
    setupMocks()
    renderPage()
    
    fireEvent.click(screen.getByRole('button', { name: /Duyurular/i }))
    
    expect(screen.getByText('Test announcement')).toBeInTheDocument()
  })

  it('shows empty state for alerts', () => {
    setupMocks({ announcements: [] })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Duyurular/i }))
    expect(screen.getByText('Aktif duyuru yok')).toBeInTheDocument()
  })

  it('shows error state for alerts', () => {
    setupMocks({ announcements: null, announcementsError: 'Error' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Duyurular/i }))
    expect(screen.getByText('Duyurular yüklenemedi')).toBeInTheDocument()
  })

  it('falls back to direction-based filtering when metadata is absent and route_code has no variants', () => {
    setupMocks({
      metadata: null,
      stops: [
        { stop_code: '1001', stop_name: 'Fallback Stop G', direction: 'G', sequence: 1, latitude: 41.0, longitude: 29.0, route_code: '15TY_G' },
        { stop_code: '1002', stop_name: 'Fallback Stop D', direction: 'D', sequence: 2, latitude: 41.1, longitude: 29.1, route_code: '15TY_D' },
      ]
    })
    renderPage()
    
    fireEvent.click(screen.getByRole('button', { name: /Duraklar/i }))
    
    // Open dropdown first
    fireEvent.click(screen.getAllByText('15TY_G')[0])
    fireEvent.click(screen.getAllByText('15TY_D')[0])
    // After selection, dropdown closes. The selected value is now 15TY_D
    expect(screen.getAllByText('15TY_D').length).toBeGreaterThan(0)
    
    // Check if the correct stops are filtered
    expect(screen.getByText('Fallback Stop D')).toBeInTheDocument()
    expect(screen.queryByText('Fallback Stop G')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByText('15TY_D')[0])
    fireEvent.click(screen.getAllByText('15TY_G')[0])
    expect(screen.getByText('Fallback Stop G')).toBeInTheDocument()
    expect(screen.queryByText('Fallback Stop D')).not.toBeInTheDocument()
  })

  it('supports split labels with more than 2 parts', () => {
    setupMocks({
      metadata: [
        {
          direction: 0,
          direction_name: 'TOKATKÖY - BEŞİKTAŞ - HEKİMBAŞI',
          variant_code: '15TY_G_D0',
          full_name: 'TOKATKÖY - BEŞİKTAŞ - HEKİMBAŞI',
        },
        {
          direction: 0,
          direction_name: 'TOKATKÖY - BEŞİKTAŞ - HEKİMBAŞI - EK',
          variant_code: '15TY_G_D1',
          full_name: 'TOKATKÖY - BEŞİKTAŞ - HEKİMBAŞI - EK',
        }
      ],
      stops: [
        { stop_code: '1001', stop_name: 'Test Stop 1', route_code: '15TY_G_D0', direction: 'G', sequence: 1, latitude: 41.0, longitude: 29.0 },
        { stop_code: '1002', stop_name: 'Test Stop EK', route_code: '15TY_G_D1', direction: 'G', sequence: 1, latitude: 41.1, longitude: 29.1 },
      ]
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Duraklar/i }))
    
    // Open the dropdown
    fireEvent.click(screen.getAllByText('TOKATKÖY > HEKİMBAŞI')[0])
    
    expect(screen.getAllByText('TOKATKÖY > HEKİMBAŞI').length).toBeGreaterThan(0)
    expect(screen.getByText('TOKATKÖY > EK (D1)')).toBeInTheDocument()
  })
})
