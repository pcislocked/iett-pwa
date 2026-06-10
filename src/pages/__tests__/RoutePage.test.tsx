import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RoutePage from '@/pages/RoutePage'

vi.mock('@/api/client', () => ({
  api: { 
    routes: { 
      metadata: vi.fn().mockResolvedValue([{ route_code: '15TY', full_name: 'Test' }]), 
      schedule: vi.fn().mockResolvedValue([]), 
      stops: vi.fn().mockResolvedValue([]) 
    },
    stops: { announcements: vi.fn().mockResolvedValue([]) }
  }
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  Popup: () => <div data-testid="popup" />,
  CircleMarker: () => <div data-testid="circle-marker" />,
  useMap: () => ({ setView: vi.fn(), getBounds: vi.fn(), fitBounds: vi.fn(), addLayer: vi.fn(), removeLayer: vi.fn() }),
  useMapEvents: () => ({})
}))

describe('RoutePage', () => {
  it('renders correctly', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/route/15TY']}>
          <Routes>
            <Route path="/route/:hatKodu" element={<RoutePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Sefer Saatleri')).toBeInTheDocument()
    })
  })
})
