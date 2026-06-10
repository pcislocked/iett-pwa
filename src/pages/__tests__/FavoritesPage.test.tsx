import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FavoritesPage from '@/pages/FavoritesPage'

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ favorites: [] })
}))

describe('FavoritesPage', () => {
  it('renders correctly', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('Favorilerim')).toBeInTheDocument()
  })
})
