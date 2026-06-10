import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NearbyPage from '@/pages/NearbyPage'

vi.mock('@/api/client', () => ({
  api: { stops: { nearby: vi.fn().mockResolvedValue([]) } }
}))

describe('NearbyPage', () => {
  it('renders correctly', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NearbyPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('Yakın Duraklar')).toBeInTheDocument()
  })
})
