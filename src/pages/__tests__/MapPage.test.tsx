import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MapPage from '@/pages/MapPage'

vi.mock('react-leaflet', async () => {
  const React = await import('react')
  return {
    MapContainer: React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>(({ children }, ref) => (
      <div ref={ref} data-testid="map-container">{children}</div>
    )),
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: () => <div data-testid="marker" />,
    Popup: () => <div data-testid="popup" />,
    Polyline: () => <div data-testid="polyline" />,
    CircleMarker: () => <div data-testid="circle-marker" />,
    useMap: () => ({ setView: vi.fn(), getBounds: vi.fn(), fitBounds: vi.fn(), addLayer: vi.fn(), removeLayer: vi.fn() }),
    useMapEvents: () => ({}),
  }
})

describe('MapPage', () => {
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
})
