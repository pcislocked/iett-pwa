import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PinnedManagePage from '@/pages/PinnedManagePage'

vi.mock('@/hooks/useUserPrefs', () => ({
  useUserPrefs: () => ({ prefs: { pinnedStops: [] } }),
  PINNED_STOPS_MAX: 5
}))

describe('PinnedManagePage', () => {
  it('renders correctly', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PinnedManagePage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('Sabitlenmiş Duraklar')).toBeInTheDocument()
  })
})
