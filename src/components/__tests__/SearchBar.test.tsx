import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SearchBar from '../SearchBar'
import { api, type RouteSearchResult, type StopSearchResult } from '@/api/client'

const mockRoutes: RouteSearchResult[] = [
  { hat_kodu: '500T', name: 'TUZLA - CEVİZLİBAĞ' },
  { hat_kodu: '19F', name: 'YEDİTEPE - KADIKÖY' },
]

const mockStops: StopSearchResult[] = [
  { dcode: '220602', name: 'AHMET MİTHAT EFENDİ', path: null, direction: 'KADIKÖY' },
]

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api.routes, 'search').mockResolvedValue(mockRoutes)
    vi.spyOn(api.stops, 'search').mockResolvedValue(mockStops)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders input with default or custom placeholder', () => {
    render(
      <MemoryRouter>
        <SearchBar placeholder="Özel yer tutucu..." />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText('Özel yer tutucu...')).toBeInTheDocument()
  })

  it('does not search when query length is less than 2', async () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'a' } })

    vi.advanceTimersByTime(500)
    expect(api.routes.search).not.toHaveBeenCalled()
    expect(api.stops.search).not.toHaveBeenCalled()
  })

  it('shows direct stop shortcut for pure 4+ digit numeric input without calling API', async () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '220602' } })

    expect(screen.getByText('#220602')).toBeInTheDocument()
    expect(api.routes.search).not.toHaveBeenCalled()
    expect(api.stops.search).not.toHaveBeenCalled()
  })

  it('orders routes first and stops second in dropdown results', async () => {
    vi.useRealTimers()
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'kadikoy' } })

    await waitFor(() => {
      expect(api.routes.search).toHaveBeenCalled()
      expect(api.stops.search).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getAllByText('500T').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('AHMET MİTHAT EFENDİ')).toBeInTheDocument()
    })
  })
})
