import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapEntityPicker from '../MapEntityPicker'
import type { BusPosition, NearbyStop } from '@/api/client'

const mockBuses: BusPosition[] = [
  {
    kapino: 'B-2144',
    plate: '34 TP 4412',
    latitude: 41.04,
    longitude: 29.01,
    route_code: '129T',
    route_name: 'Bostancı - Taksim',
    direction: 'Taksim',
    direction_letter: 'G',
    speed: 18,
    operator: null,
    nearest_stop: null,
    stop_sequence: 5,
    last_seen: '2026-10-28T14:35:00',
  },
  {
    kapino: 'A-128',
    plate: '34 HO 1028',
    latitude: 41.05,
    longitude: 29.02,
    route_code: '28T',
    route_name: 'Topkapı - Beşiktaş',
    direction: 'Beşiktaş',
    direction_letter: 'D',
    speed: 0,
    operator: null,
    nearest_stop: null,
    stop_sequence: 12,
    last_seen: '2026-10-28T14:34:00',
  },
]

const mockStops: NearbyStop[] = [
  {
    stop_code: '113412',
    stop_name: 'BARBAROS BULVARI',
    latitude: 41.04,
    longitude: 29.01,
    district: 'Beşiktaş',
    direction: 'Levent Yönü',
    distance_m: 10,
  },
]

describe('MapEntityPicker (Variation 2 - Filter Pills)', () => {
  it('renders mixed entity header when both buses and stops exist', () => {
    const onSelectBus = vi.fn()
    const onSelectStop = vi.fn()
    const onClose = vi.fn()

    render(
      <MapEntityPicker
        buses={mockBuses}
        stops={mockStops}
        onSelectBus={onSelectBus}
        onSelectStop={onSelectStop}
        onClose={onClose}
      />,
    )

    expect(screen.getByText(/Bu noktada araç ve duraklar var/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tümü \(3\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Duraklar \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Araçlar \(2\)/i })).toBeInTheDocument()

    // Stop and bus both rendered under 'all'
    expect(screen.getByText('BARBAROS BULVARI')).toBeInTheDocument()
    expect(screen.getByText(/B-2144/i)).toBeInTheDocument()
    expect(screen.getByText(/A-128/i)).toBeInTheDocument()
  })

  it('filters items when clicking filter pills', () => {
    const onSelectBus = vi.fn()
    const onSelectStop = vi.fn()
    const onClose = vi.fn()

    render(
      <MapEntityPicker
        buses={mockBuses}
        stops={mockStops}
        onSelectBus={onSelectBus}
        onSelectStop={onSelectStop}
        onClose={onClose}
      />,
    )

    // Click Duraklar pill
    const stopsPill = screen.getByRole('button', { name: /Duraklar \(1\)/i })
    fireEvent.click(stopsPill)

    expect(screen.getByText('BARBAROS BULVARI')).toBeInTheDocument()
    expect(screen.queryByText(/B-2144/i)).not.toBeInTheDocument()

    // Click Araçlar pill
    const busesPill = screen.getByRole('button', { name: /Araçlar \(2\)/i })
    fireEvent.click(busesPill)

    expect(screen.queryByText('BARBAROS BULVARI')).not.toBeInTheDocument()
    expect(screen.getByText(/B-2144/i)).toBeInTheDocument()
    expect(screen.getByText(/A-128/i)).toBeInTheDocument()
  })

  it('calls onSelectStop when stop is clicked', () => {
    const onSelectBus = vi.fn()
    const onSelectStop = vi.fn()
    const onClose = vi.fn()

    render(
      <MapEntityPicker
        buses={mockBuses}
        stops={mockStops}
        onSelectBus={onSelectBus}
        onSelectStop={onSelectStop}
        onClose={onClose}
      />,
    )

    const stopItem = screen.getByText('BARBAROS BULVARI').closest('button')!
    fireEvent.click(stopItem)

    expect(onSelectStop).toHaveBeenCalledWith(mockStops[0])
  })

  it('calls onSelectBus when bus is clicked', () => {
    const onSelectBus = vi.fn()
    const onSelectStop = vi.fn()
    const onClose = vi.fn()

    render(
      <MapEntityPicker
        buses={mockBuses}
        stops={mockStops}
        onSelectBus={onSelectBus}
        onSelectStop={onSelectStop}
        onClose={onClose}
      />,
    )

    const busItem = screen.getByText(/B-2144/).closest('button')!
    fireEvent.click(busItem)

    expect(onSelectBus).toHaveBeenCalledWith('B-2144')
  })
})
