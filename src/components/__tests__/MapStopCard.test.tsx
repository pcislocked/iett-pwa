import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapStopCard from '../MapStopCard'
import * as useArrivalsModule from '@/hooks/useArrivals'
import type { Arrival } from '@/api/client'

const mockArrivals: Arrival[] = [
  {
    route_code: '129T',
    destination: 'TAKSİM',
    eta_minutes: 2,
    eta_raw: '2 dk',
    plate: '34 TP 4412',
    kapino: 'B-2144',
    lat: 41.04,
    lon: 29.01,
    speed_kmh: 20,
    last_seen_ts: '14:35:00',
    amenities: null,
  },
  {
    route_code: '28T',
    destination: 'BEŞİKTAŞ',
    eta_minutes: 5,
    eta_raw: '5 dk',
    plate: '34 HO 1028',
    kapino: 'A-128',
    lat: 41.05,
    lon: 29.02,
    speed_kmh: 0,
    last_seen_ts: '14:34:00',
    amenities: null,
  },
]

describe('MapStopCard (Variation A)', () => {
  const defaultStop = {
    stop_code: '113412',
    stop_name: 'BARBAROS BULVARI',
    direction: 'Levent Yönü',
    district: 'Beşiktaş',
    latitude: 41.05,
    longitude: 29.01,
    distance_m: 15,
  }

  const onClose = vi.fn()
  const onOpenStop = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders stop name, code, and direction', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: mockArrivals,
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(<MapStopCard stop={defaultStop} onClose={onClose} onOpenStop={onOpenStop} />)

    expect(screen.getByText('BARBAROS BULVARI')).toBeInTheDocument()
    expect(screen.getByText('#113412')).toBeInTheDocument()
    expect(screen.getByText(/Levent Yönü/)).toBeInTheDocument()
    expect(screen.getByText('129T')).toBeInTheDocument()
    expect(screen.getByText('2 dk')).toBeInTheDocument()
    expect(screen.getByText('28T')).toBeInTheDocument()
    expect(screen.getByText('5 dk')).toBeInTheDocument()
  })

  it('triggers onOpenStop when full-width CTA is clicked', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: mockArrivals,
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(<MapStopCard stop={defaultStop} onClose={onClose} onOpenStop={onOpenStop} />)

    const cta = screen.getByRole('button', { name: /Durağı Aç/i })
    fireEvent.click(cta)

    expect(onOpenStop).toHaveBeenCalledWith('113412')
  })

  it('triggers onClose when close button is clicked', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(<MapStopCard stop={defaultStop} onClose={onClose} onOpenStop={onOpenStop} />)

    const closeBtn = screen.getByRole('button', { name: /Kapat/i })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })

  it('renders fallback text when no upcoming arrivals', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(<MapStopCard stop={defaultStop} onClose={onClose} onOpenStop={onOpenStop} />)

    expect(screen.getByText(/yaklaşan araç görünmüyor/i)).toBeInTheDocument()
  })

  it('triggers onClose when Escape key is pressed', () => {
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })

    render(<MapStopCard stop={defaultStop} onClose={onClose} onOpenStop={onOpenStop} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
