import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerHaptic } from '../haptics'

describe('haptics', () => {
  let vibrateMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vibrateMock = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers light vibration pattern', () => {
    triggerHaptic('light', true)
    expect(vibrateMock).toHaveBeenCalledWith(10)
  })

  it('triggers medium vibration pattern', () => {
    triggerHaptic('medium', true)
    expect(vibrateMock).toHaveBeenCalledWith(15)
  })

  it('triggers success vibration pattern', () => {
    triggerHaptic('success', true)
    expect(vibrateMock).toHaveBeenCalledWith([10, 30, 15])
  })

  it('triggers warning vibration pattern', () => {
    triggerHaptic('warning', true)
    expect(vibrateMock).toHaveBeenCalledWith([20, 40, 20])
  })

  it('does not trigger vibration when enabled=false', () => {
    triggerHaptic('medium', false)
    expect(vibrateMock).not.toHaveBeenCalled()
  })

  it('does not throw when navigator.vibrate is undefined', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    expect(() => triggerHaptic('light', true)).not.toThrow()
  })
})
