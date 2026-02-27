import { describe, it, expect } from 'vitest'
import { distanceLabel } from '@/utils/distance'

describe('distanceLabel', () => {
  it('shows metres for distances under 1 km', () => {
    expect(distanceLabel(500)).toBe('500 m')
  })

  it('rounds metres to integer', () => {
    expect(distanceLabel(123.7)).toBe('124 m')
  })

  it('shows 0 m at origin', () => {
    expect(distanceLabel(0)).toBe('0 m')
  })

  it('shows km for distances >= 1000 m', () => {
    expect(distanceLabel(1000)).toBe('1.0 km')
  })

  it('formats km to 1 decimal place', () => {
    expect(distanceLabel(2500)).toBe('2.5 km')
  })

  it('shows exact boundary: 999 m', () => {
    expect(distanceLabel(999)).toBe('999 m')
  })

  it('shows exact boundary: 1001 m', () => {
    expect(distanceLabel(1001)).toBe('1.0 km')
  })

  it('handles large distances', () => {
    expect(distanceLabel(45000)).toBe('45.0 km')
  })
})
