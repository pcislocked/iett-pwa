import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import InstallBanner, { useInstallBanner } from '../InstallBanner'

describe('InstallBanner Component', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    window.matchMedia = originalMatchMedia
  })

  it('renders install banner and triggers onInstall and onDismiss', () => {
    const handleInstall = vi.fn()
    const handleDismiss = vi.fn()

    render(
      <InstallBanner
        onInstall={handleInstall}
        onDismiss={handleDismiss}
      />
    )

    expect(screen.getByText('Ana Ekrana Ekle')).toBeInTheDocument()
    expect(screen.getByText('çevrimdışı çalışır, pil dostu')).toBeInTheDocument()

    const installButton = screen.getByText('Yükle')
    fireEvent.click(installButton)
    expect(handleInstall).toHaveBeenCalledTimes(1)

    const closeButton = screen.getByLabelText(/Kapat|Close/i)
    fireEvent.click(closeButton)
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it('handles useInstallBanner beforeinstallprompt event and dismissal', async () => {
    const { result } = renderHook(() => useInstallBanner())

    expect(result.current.show).toBe(false)

    // Dispatch beforeinstallprompt event
    const promptMock = vi.fn().mockResolvedValue(undefined)
    const userChoiceMock = Promise.resolve({ outcome: 'accepted' as const })
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: promptMock,
      userChoice: userChoiceMock,
    })

    act(() => {
      window.dispatchEvent(event)
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.show).toBe(true)

    // Trigger install
    await act(async () => {
      await result.current.install()
    })

    expect(promptMock).toHaveBeenCalled()
    expect(result.current.show).toBe(false)

    // Test dismiss
    act(() => {
      result.current.dismiss()
    })

    expect(localStorage.getItem('iett-install-dismissed')).toBe('1')
  })
})
