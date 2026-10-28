import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MapPage from '@/pages/MapPage'

let mockZoom = 11
let mockCenter = { lat: 41.04, lng: 29.01, distanceTo: () => 5 }

interface MockMapHandle {
  getCenter: () => typeof mockCenter
  getZoom: () => number
  getBounds: () => { getNorthEast: () => { lat: number; lng: number } }
  latLngToContainerPoint: () => { distanceTo: () => number }
}

vi.mock('react-leaflet', async () => {
  const React = await import('react')
  return {
    MapContainer: React.forwardRef<MockMapHandle, { children?: React.ReactNode }>(({ children }, ref) => {
      React.useImperativeHandle(ref, () => ({
        getCenter: () => mockCenter,
        getZoom: () => mockZoom,
        getBounds: () => ({ getNorthEast: () => ({ lat: 41.05, lng: 29.02 }) }),
        latLngToContainerPoint: () => ({ distanceTo: () => 10 }),
      }))
      return <div data-testid="map-container">{children}</div>
    }),
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: () => <div data-testid="marker" />,
    Popup: () => <div data-testid="popup" />,
    Polyline: () => <div data-testid="polyline" />,
    CircleMarker: () => <div data-testid="circle-marker" />,
    useMap: () => ({ setView: vi.fn(), getBounds: vi.fn(), fitBounds: vi.fn(), addLayer: vi.fn(), removeLayer: vi.fn() }),
    useMapEvents: () => ({
      getZoom: () => mockZoom,
      getCenter: () => mockCenter,
    }),
  }
})

vi.mock('@/api/client', () => ({
  api: {
    stops: {
      nearby: vi.fn().mockResolvedValue([
        {
          stop_code: '113412',
          stop_name: 'BARBAROS BULVARI',
          latitude: 41.04,
          longitude: 29.01,
          district: 'Beşiktaş',
          direction: 'Levent Yönü',
          distance_m: 5,
        },
      ]),
      routes: vi.fn().mockResolvedValue([]),
    },
    fleet: {
      positions: vi.fn().mockResolvedValue([]),
      detail: vi.fn().mockResolvedValue(null),
    },
    arac: {
      autoDetail: vi.fn().mockResolvedValue(null),
    },
    routes: {
      metadata: vi.fn().mockResolvedValue(null),
    },
  },
}))

describe('MapPage', () => {
  beforeEach(() => {
    mockZoom = 11
    mockCenter = { lat: 41.04, lng: 29.01, distanceTo: () => 5 }
    vi.clearAllMocks()
  })

  it('renders correctly and displays zoom in prompt when zoom < 14', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MapPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    // At default zoom (11), pill should prompt to zoom in
    expect(screen.getByText(/Durakları görmek için yakınlaşın/i)).toBeInTheDocument()
  })

  it('switches between "Bu Bölgedeki Durakları Ara", "Liste Olarak Göster", and clears area stops', async () => {
    mockZoom = 15
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MapPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // At zoom >= 14, search button appears
    const searchBtn = await screen.findByRole('button', { name: /Bu Bölgedeki Durakları Ara/i })
    expect(searchBtn).toBeInTheDocument()

    // Click search
    fireEvent.click(searchBtn)

    // After search resolves and distance <= 10m, transforms to "Liste Olarak Göster"
    const listBtn = await screen.findByRole('button', { name: /Liste Olarak Göster/i })
    expect(listBtn).toBeInTheDocument()

    // Clear button appears
    const clearBtn = screen.getByRole('button', { name: /Bölge duraklarını temizle/i })
    expect(clearBtn).toBeInTheDocument()

    // Click clear button
    fireEvent.click(clearBtn)

    // Reverts back to "Bu Bölgedeki Durakları Ara" and clear button disappears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bu Bölgedeki Durakları Ara/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /Bölge duraklarını temizle/i })).not.toBeInTheDocument()
  })
})
