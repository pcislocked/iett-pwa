import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArrivalCard from '@/components/ArrivalCard'
import type { Arrival } from '@/api/client'

function makeArrival(override: Partial<Arrival> = {}): Arrival {
  return {
    route_code: '500T',
    destination: 'TUZLA ŞİFA MAHALLESİ',
    eta_minutes: 4,
    eta_raw: '4 dk',
    plate: null,
    kapino: null,
    ...override,
  }
}

describe('ArrivalCard', () => {
  it('renders route code', () => {
    render(<ArrivalCard arrival={makeArrival()} />)
    expect(screen.getByText('500T')).toBeInTheDocument()
  })

  it('renders destination', () => {
    render(<ArrivalCard arrival={makeArrival()} />)
    expect(screen.getByText('TUZLA ŞİFA MAHALLESİ')).toBeInTheDocument()
  })

  it('renders eta_minutes when present', () => {
    render(<ArrivalCard arrival={makeArrival({ eta_minutes: 7 })} />)
    expect(screen.getByText('7 dk')).toBeInTheDocument()
  })

  it('falls back to eta_raw when eta_minutes is null', () => {
    render(<ArrivalCard arrival={makeArrival({ eta_minutes: null, eta_raw: 'yakında' })} />)
    expect(screen.getByText('yakında')).toBeInTheDocument()
  })

  it('applies ring class when highlighted', () => {
    const { container } = render(<ArrivalCard arrival={makeArrival()} highlighted={true} />)
    expect(container.firstChild).toHaveClass('ring-2')
  })

  it('does not apply ring class by default', () => {
    const { container } = render(<ArrivalCard arrival={makeArrival()} />)
    expect(container.firstChild).not.toHaveClass('ring-2')
  })

  it('shows soon class for eta < 5 min', () => {
    render(<ArrivalCard arrival={makeArrival({ eta_minutes: 2 })} />)
    const eta = screen.getByText('2 dk')
    expect(eta).toHaveClass('eta-soon')
  })

  it('shows coming class for eta 5-14 min', () => {
    render(<ArrivalCard arrival={makeArrival({ eta_minutes: 10 })} />)
    const eta = screen.getByText('10 dk')
    expect(eta).toHaveClass('eta-coming')
  })

  it('shows far class for eta >= 15 min', () => {
    render(<ArrivalCard arrival={makeArrival({ eta_minutes: 20 })} />)
    const eta = screen.getByText('20 dk')
    expect(eta).toHaveClass('eta-far')
  })

  it('shows far class for null eta', () => {
    render(<ArrivalCard arrival={makeArrival({ eta_minutes: null, eta_raw: '?' })} />)
    const eta = screen.getByText('?')
    expect(eta).toHaveClass('eta-far')
  })
})
