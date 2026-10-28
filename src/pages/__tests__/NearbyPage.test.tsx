import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NearbyPage from '@/pages/NearbyPage'

vi.mock('@/api/client', () => ({
  api: {
    stops: {
      nearby: vi.fn().mockResolvedValue([
        {
          stop_code: '1001',
          stop_name: 'Kadıköy',
          latitude: 40.99,
          longitude: 29.02,
          distance_m: 150,
          direction: 'KADIKÖY',
        },
      ]),
      routes: vi.fn().mockResolvedValue(['19F', '500T']),
    },
  },
}))

describe('NearbyPage', () => {
  it('renders correctly and allows opening location picker modal', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NearbyPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Yakın Duraklar')).toBeInTheDocument()

    // Find "Konum Seç" button in header
    const pickBtn = screen.getByRole('button', { name: /Haritadan Seç/i })
    expect(pickBtn).toBeInTheDocument()

    // Click to open modal
    fireEvent.click(pickBtn)

    // Modal should be open
    expect(screen.getByText(/Bu Noktayı Seç/i)).toBeInTheDocument()

    // Select this point
    fireEvent.click(screen.getByText(/Bu Noktayı Seç/i))

    // Temporary location badge and reset button should now appear
    await waitFor(() => {
      expect(screen.getByText(/Tek Seferlik/i)).toBeInTheDocument()
    })
    const resetBtn = screen.getByTitle(/GPS Konumuna Dön/i)
    expect(resetBtn).toBeInTheDocument()

    // Resetting location removes the badge
    fireEvent.click(resetBtn)
    expect(screen.queryByText(/Tek Seferlik/i)).not.toBeInTheDocument()
  })

  it('initializes overrideLocation from lat and lon search params', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { api } = await import('@/api/client')

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/nearby?lat=41.05&lon=29.02']}>
          <NearbyPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(api.stops.nearby).toHaveBeenCalledWith(
        41.05,
        29.02,
        expect.any(Number),
        expect.any(Number),
        expect.anything(),
      )
    })
    expect(screen.getByText(/Tek Seferlik/i)).toBeInTheDocument()
  })
})
