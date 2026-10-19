import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AracQueryPage from '@/pages/AracQueryPage'
import { api, type BusPosition } from '@/api/client'
import * as useFleetModule from '@/hooks/useFleet'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/api/client', () => ({
  api: {
    arac: {
      suggest: vi.fn(),
    },
  },
}))

const mockUseFleetReturn = (
  data: BusPosition[] | null = null
): ReturnType<typeof useFleetModule.useFleet> => ({
  data,
  loading: false,
  error: null,
  refresh: vi.fn(),
  stale: false,
  lastUpdated: null,
})

describe('AracQueryPage Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AracQueryPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('matches local fleet vehicles by kapino or plate and navigates on click', async () => {
    vi.spyOn(useFleetModule, 'useFleet').mockReturnValue(
      mockUseFleetReturn([
        {
          kapino: 'C-1753',
          plate: '34 HO 1753',
          route_code: '500T',
          latitude: 41.05,
          longitude: 29.01,
          speed: 35,
          operator: 'IETT',
          last_seen: '12:00',
          route_name: '500T',
          direction: 'D',
          direction_letter: 'D',
          nearest_stop: null,
          stop_sequence: null,
        },
      ])
    )

    renderPage()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '1753' } })

    await waitFor(() => {
      expect(screen.getByText('C-1753')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('C-1753'))
    expect(mockNavigate).toHaveBeenCalledWith('/arac/bus/C-1753')
  })

  it('falls back to remote suggest if not found in local fleet', async () => {
    vi.spyOn(useFleetModule, 'useFleet').mockReturnValue(mockUseFleetReturn([]))

    vi.mocked(api.arac.suggest).mockResolvedValue([
      { doorNumber: 'M-9999', plate: '34 HO 9999' },
    ])

    renderPage()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'M-9999' } })

    await waitFor(() => {
      expect(screen.getByText('M-9999')).toBeInTheDocument()
    })
  })
})
