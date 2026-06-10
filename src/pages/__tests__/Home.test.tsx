import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '@/pages/Home'

vi.mock('@/hooks/useUserPrefs', () => ({
  useUserPrefs: () => ({ prefs: { pinnedStops: [{ dcode: '1234', title: 'Test Stop', hat_dcode: '15TY' }] } }),
  PINNED_STOPS_MAX: 5
}))
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ favorites: [{ kind: 'stop', id: '1234', title: 'Fav Stop' }] })
}))
vi.mock('@/hooks/useRecentSearches', () => ({
  getRecent: () => [{ type: 'route', id: '15TY', label: '15TY', timestamp: 1234 }]
}))
vi.mock('@/api/client', () => ({
  api: { 
    stops: { nearby: vi.fn().mockResolvedValue([]), detail: vi.fn().mockResolvedValue({ dcode: '1234' }) }
  }
}))

describe('Home', () => {
  it('renders correctly with data', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('Sabitlenmiş Duraklar')).toBeInTheDocument()
  })
})
