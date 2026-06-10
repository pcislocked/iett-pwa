import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingsPage from '@/pages/SettingsPage'

describe('SettingsPage', () => {
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
})
