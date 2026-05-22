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
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => <div />,
  Marker: () => <div />,
  Popup: () => <div />,
  CircleMarker: () => <div />,
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

  it('renders dynamic footnotes for sub-routes and descriptive direction labels', async () => {
    // Setup mock data for usePolling
    // usePolling is called 4 times in RoutePage: stops, schedule, announcements, metadata
    mocks.usePolling.mockImplementation((fetcher: any) => {
      const fetcherString = fetcher.toString()
      if (fetcherString.includes('stops')) return { data: [] }
      if (fetcherString.includes('schedule')) {
        return {
          data: [
            // Standard trip
            { route_variant: '15TY_G_D0', day_type: 'H', direction: 'G', departure_time: '10:00' },
            // Sub-variants
            { route_variant: '15TY_G_D2449', day_type: 'H', direction: 'G', departure_time: '10:30' },
            { route_variant: '15TY_G_D1234', day_type: 'H', direction: 'G', departure_time: '11:00' },
            // Reverse direction to force tabs to render
            { route_variant: '15TY_D_D0', day_type: 'H', direction: 'D', departure_time: '12:00' },
          ]
        }
      }
      if (fetcherString.includes('announcements')) return { data: [] }
      if (fetcherString.includes('metadata')) {
        return {
          data: [
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

    renderPage()

    // 1. Verify descriptive direction tab labels exist (instead of generic "Gidiş")
    // Direction tabs render "TOKATKÖY KALKIŞ" in the timetable view.
    expect(screen.getByText('TOKATKÖY KALKIŞ')).toBeInTheDocument()

    // Switch to 'G' direction if not already selected (availableDirections sorts 'D' first)
    fireEvent.click(screen.getByText('TOKATKÖY KALKIŞ'))

    // 2. Verify footnotes are generated for sub-routes (D2449, D1234)
    // 10:00 is standard (no footnote)
    // 10:30 is D2449
    // 11:00 is D1234
    // Since uniqueVariants is sorted, D1234 should be ¹ and D2449 should be ²
    expect(screen.getByText('1')).toBeInTheDocument() // footnote 1
    expect(screen.getByText('2')).toBeInTheDocument() // footnote 2
    
    // 3. Verify the Legend matches the variants
    expect(screen.getByText('Notlar (Yan Seferler)')).toBeInTheDocument()
    expect(screen.getByText('TOKATKÖY - ÇAVUŞBAŞI')).toBeInTheDocument() // D1234
    expect(screen.getByText('TOKATKÖY - YENİ MAHALLE')).toBeInTheDocument() // D2449
  })
})
