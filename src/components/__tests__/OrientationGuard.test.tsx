import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrientationGuard from '../OrientationGuard'
import * as kioskHook from '@/hooks/useKioskMode'

describe('OrientationGuard Component', () => {
  it('renders orientation warning overlay when not in kiosk mode', () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(false)

    render(<OrientationGuard />)

    expect(screen.getByText(/Lütfen Cihazınızı Dikey Konuma Getirin/i)).toBeInTheDocument()
    expect(screen.getByText(/yalnızca dikey kullanım için optimize edilmiştir/i)).toBeInTheDocument()
  })

  it('does not render when kiosk mode is active', () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(true)

    const { container } = render(<OrientationGuard />)

    expect(container.firstChild).toBeNull()
  })
})
