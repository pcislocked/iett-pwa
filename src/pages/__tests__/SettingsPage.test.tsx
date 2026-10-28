import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingsPage from '@/pages/SettingsPage'
import { DISMISSED_STORAGE_KEY, SEEN_SINGLE_STORAGE_KEY } from '@/hooks/usePwaAnnouncements'
import { LAST_SEEN_VERSION_KEY } from '@/hooks/useVersionBanner'

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders correctly', () => {
    vi.stubGlobal('__APP_VERSION__', '1.0.0')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('Ayarlar')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('resets hidden announcements and version banner when button is clicked', () => {
    vi.stubGlobal('__APP_VERSION__', '1.0.0')
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([1, 2]))
    localStorage.setItem(SEEN_SINGLE_STORAGE_KEY, JSON.stringify([3]))
    localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.4.12')

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const resetBtn = screen.getByTestId('reset-hidden-announcements-btn')
    expect(resetBtn).toBeInTheDocument()

    fireEvent.click(resetBtn)

    expect(localStorage.getItem(DISMISSED_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(SEEN_SINGLE_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe('1.0')
    expect(screen.getByText('✓ Sıfırlandı')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})
