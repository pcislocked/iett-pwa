import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FavoritesPage from '@/pages/FavoritesPage'
import * as useFavoritesModule from '@/hooks/useFavorites'

const realFavorites: useFavoritesModule.Favorite[] = [
  {
    kind: 'stop',
    dcode: '225652',
    name: 'KAVACIK AKTARMA',
  },
  {
    kind: 'route',
    hat_kodu: '500T',
    name: 'TUZLA - CEVİZLİBAĞ',
  },
]

describe('FavoritesPage Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  it('renders empty state when favorites list is empty', () => {
    vi.spyOn(useFavoritesModule, 'useFavorites').mockReturnValue({
      favorites: [],
      toggle: vi.fn(),
      isFavorite: vi.fn().mockReturnValue(false),
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Favorilerim')).toBeInTheDocument()
    expect(screen.getByText('Henüz favori eklemediniz')).toBeInTheDocument()
  })

  it('renders favorite stops and routes and handles removal', () => {
    const mockToggle = vi.fn()
    vi.spyOn(useFavoritesModule, 'useFavorites').mockReturnValue({
      favorites: realFavorites,
      toggle: mockToggle,
      isFavorite: vi.fn().mockReturnValue(true),
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('KAVACIK AKTARMA')).toBeInTheDocument()
    expect(screen.getByText('225652')).toBeInTheDocument()
    expect(screen.getByText('TUZLA - CEVİZLİBAĞ')).toBeInTheDocument()
    expect(screen.getByText('500T')).toBeInTheDocument()

    // Remove first favorite
    const removeButtons = screen.getAllByLabelText(/Favoriden kaldır|Remove/i)
    fireEvent.click(removeButtons[0])

    expect(mockToggle).toHaveBeenCalledWith(realFavorites[0])
  })
})
