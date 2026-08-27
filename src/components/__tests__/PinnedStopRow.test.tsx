import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PinnedStopRow from '../PinnedStopRow'
import { api, type StopDetail, type Arrival } from '@/api/client'
import * as useArrivalsModule from '@/hooks/useArrivals'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const realArrivals: Arrival[] = [
  {
    route_code: '500T',
    destination: 'TUZLA',
    eta_minutes: 3,
    eta_raw: '3 dk',
    plate: '34 HO 1000',
    kapino: 'B-1000',
    lat: 41.02,
    lon: 29.05,
    speed_kmh: 30,
    last_seen_ts: '14:35:00',
    amenities: { ac: true, usb: true, wifi: false, accessible: true },
  },
  {
    route_code: '15F',
    destination: 'KADIKÖY',
    eta_minutes: 8,
    eta_raw: '8 dk',
    plate: '34 TP 2000',
    kapino: 'A-2000',
    lat: 41.01,
    lon: 29.03,
    speed_kmh: 25,
    last_seen_ts: '14:34:00',
    amenities: { ac: true, usb: false, wifi: false, accessible: true },
  },
]

const realStopDetail: StopDetail = {
  dcode: '225652',
  name: 'KAVACIK AKTARMA',
  latitude: 41.092,
  longitude: 29.094,
  direction: 'KADIKÖY YÖNÜ',
}

describe('PinnedStopRow Component', () => {
  let detailSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    detailSpy = vi.spyOn(api.stops, 'detail').mockResolvedValue(realStopDetail)
  })

  it('renders pinned stop with real arrival pills and navigates to stop page on click', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: realArrivals,
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(
      <MemoryRouter>
        <PinnedStopRow
          dcode="225652"
          nick="Kavacık Aktarma"
          icon="⭐"
          distLabel="150m"
        />
      </MemoryRouter>
    )

    expect(screen.getByText('Kavacık Aktarma')).toBeInTheDocument()
    expect(screen.getByText('150m')).toBeInTheDocument()
    expect(screen.getByText('⭐')).toBeInTheDocument()
    expect(screen.getByText('500T:3dk')).toBeInTheDocument()
    expect(screen.getByText('15F:8dk')).toBeInTheDocument()

    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(mockNavigate).toHaveBeenCalledWith('/stops/225652')
  })

  it('fetches stop detail direction when directionProp is not provided', async () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(
      <MemoryRouter>
        <PinnedStopRow
          dcode="225652"
          nick="Kavacık Aktarma"
        />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/KADIKÖY YÖNÜ/)).toBeInTheDocument()
    })
  })

  it('skips detail fetch when directionProp is provided', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(
      <MemoryRouter>
        <PinnedStopRow
          dcode="225652"
          nick="Kavacık Aktarma"
          direction="ÖZEL YÖN"
        />
      </MemoryRouter>
    )

    expect(screen.getByText(/ÖZEL YÖN/)).toBeInTheDocument()
    expect(detailSpy).not.toHaveBeenCalled()
  })
})
