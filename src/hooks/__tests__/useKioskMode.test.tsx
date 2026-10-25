import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { useKioskMode } from '../useKioskMode'

describe('useKioskMode', () => {
  it('returns false when no kiosk or embed parameter is present', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/stops/12345']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => useKioskMode(), { wrapper })
    expect(result.current).toBe(false)
  })

  it('returns true when kiosk=1 or kiosk=true', () => {
    const wrapper1 = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/stops/12345?kiosk=1']}>{children}</MemoryRouter>
    )
    const { result: r1 } = renderHook(() => useKioskMode(), { wrapper: wrapper1 })
    expect(r1.current).toBe(true)

    const wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/stops/12345?kiosk=true']}>{children}</MemoryRouter>
    )
    const { result: r2 } = renderHook(() => useKioskMode(), { wrapper: wrapper2 })
    expect(r2.current).toBe(true)
  })

  it('returns true when embed=1 or embed=true', () => {
    const wrapper1 = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/stops/12345?embed=1']}>{children}</MemoryRouter>
    )
    const { result: r1 } = renderHook(() => useKioskMode(), { wrapper: wrapper1 })
    expect(r1.current).toBe(true)

    const wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/stops/12345?embed=true']}>{children}</MemoryRouter>
    )
    const { result: r2 } = renderHook(() => useKioskMode(), { wrapper: wrapper2 })
    expect(r2.current).toBe(true)
  })
})
