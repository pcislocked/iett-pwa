import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api, type RouteMetadata } from '@/api/client'
import RoutePage from '@/pages/RoutePage'
import React from 'react'

vi.mock('@/api/client', () => ({
  api: {
    routes: {
      metadata: vi.fn().mockResolvedValue([
        {
          hat_kodu: '15TY',
          direction_name: 'Gidiş',
          full_name: 'Test',
          variant_code: '15TY_G',
          direction: 0,
          depar_no: 1,
        },
      ]),
      schedule: vi.fn().mockResolvedValue([]),
      stops: vi.fn().mockResolvedValue([]),
    },
    stops: { announcements: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
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
        <MemoryRouter initialEntries={['/routes/15TY']}>
          <Routes>
            <Route path="/routes/:hatKodu" element={<RoutePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Tarife')).toBeInTheDocument()
    })
  })

  it('renders not found for empty metadata', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    
    // Mock the api response for this specific test
    vi.mocked(api.routes.metadata).mockResolvedValueOnce([])
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/routes/UNKNOWN']}>
          <Routes>
            <Route path="/routes/:hatKodu" element={<RoutePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Hat Bulunamadı')).toBeInTheDocument()
      expect(screen.getByText('Ana Sayfaya Dön')).toBeInTheDocument()
    })
  })
})
