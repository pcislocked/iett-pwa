import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrientationGuard from '../OrientationGuard'
import * as kioskHook from '@/hooks/useKioskMode'

describe('OrientationGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders orientation warning overlay with proper ARIA attributes when not in kiosk mode', () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(false)

    render(<OrientationGuard />)

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'orientation-guard-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'orientation-guard-desc')
    expect(dialog).toHaveAttribute('tabindex', '-1')

    expect(screen.getByText(/Lütfen Cihazınızı Dikey Konuma Getirin/i)).toBeInTheDocument()
    expect(screen.getByText(/yalnızca dikey kullanım için optimize edilmiştir/i)).toBeInTheDocument()
  })

  it('does not render when kiosk mode is active', () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(true)

    const { container } = render(<OrientationGuard />)

    expect(container.firstChild).toBeNull()
  })

  it('locks orientation to portrait-primary when not in kiosk mode, and unlocks on unmount', () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(false)
    const lockMock = vi.fn().mockResolvedValue(undefined)
    const unlockMock = vi.fn()

    Object.defineProperty(window, 'screen', {
      value: {
        orientation: {
          lock: lockMock,
          unlock: unlockMock,
        },
      },
      configurable: true,
      writable: true,
    })

    const { unmount } = render(<OrientationGuard />)

    expect(lockMock).toHaveBeenCalledWith('portrait-primary')

    unmount()
    expect(unlockMock).toHaveBeenCalled()
  })

  it('does not attempt orientation lock when in kiosk mode', () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(true)
    const lockMock = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(window, 'screen', {
      value: {
        orientation: {
          lock: lockMock,
        },
      },
      configurable: true,
      writable: true,
    })

    render(<OrientationGuard />)

    expect(lockMock).not.toHaveBeenCalled()
  })

  it('silently catches orientation lock rejection', async () => {
    vi.spyOn(kioskHook, 'useKioskMode').mockReturnValue(false)
    const lockMock = vi.fn().mockRejectedValue(new DOMException('Not supported', 'NotSupportedError'))

    Object.defineProperty(window, 'screen', {
      value: {
        orientation: {
          lock: lockMock,
        },
      },
      configurable: true,
      writable: true,
    })

    expect(() => render(<OrientationGuard />)).not.toThrow()
  })
})
