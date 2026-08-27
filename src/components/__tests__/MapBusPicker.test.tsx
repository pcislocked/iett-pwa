import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapBusPicker from '../MapBusPicker'
import type { BusPosition } from '@/api/client'

const mockBuses: BusPosition[] = [
  {
    kapino: 'B1234',
    plate: '34 TP 1234',
    route_code: '500T',
    route_name: 'TUZLA - CEVİZLİBAĞ',
    latitude: 41.0,
    longitude: 29.0,
    speed: 30,
    operator: 'İETT',
    nearest_stop: '301341',
    direction: 'D',
    direction_letter: 'D',
    stop_sequence: 12,
    last_seen: '14:30:00',
  },
  {
    kapino: 'A5678',
    plate: '34 HO 5678',
    route_code: '15F',
    route_name: 'BEYKOZ - KADIKÖY',
    latitude: 41.0,
    longitude: 29.0,
    speed: 25,
    operator: 'ÖHO',
    nearest_stop: '301341',
    direction: 'G',
    direction_letter: 'G',
    stop_sequence: 5,
    last_seen: '14:31:00',
  },
]

describe('MapBusPicker Component', () => {
  it('renders list of buses at location point', () => {
    render(
      <MapBusPicker
        buses={mockBuses}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('B1234')).toBeInTheDocument()
    expect(screen.getByText('34 TP 1234')).toBeInTheDocument()
    expect(screen.getByText('500T')).toBeInTheDocument()

    expect(screen.getByText('A5678')).toBeInTheDocument()
    expect(screen.getByText('34 HO 5678')).toBeInTheDocument()
    expect(screen.getByText('15F')).toBeInTheDocument()
  })

  it('handles vehicle selection and closes picker', () => {
    const handleSelect = vi.fn()
    const handleClose = vi.fn()

    render(
      <MapBusPicker
        buses={mockBuses}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    )

    const busButton = screen.getByText('B1234').closest('button')
    expect(busButton).not.toBeNull()
    if (busButton) fireEvent.click(busButton)

    expect(handleSelect).toHaveBeenCalledWith('B1234')
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('handles close button click', () => {
    const handleClose = vi.fn()

    render(
      <MapBusPicker
        buses={mockBuses}
        onSelect={vi.fn()}
        onClose={handleClose}
      />
    )

    const closeButton = screen.getByLabelText(/Kapat|Close/i)
    fireEvent.click(closeButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
