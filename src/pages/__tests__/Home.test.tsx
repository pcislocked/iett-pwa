import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '@/pages/Home'

vi.mock('@/hooks/useUserPrefs', () => ({
  useUserPrefs: () => ({
    prefs: {
      pinnedStops: [{ dcode: '1234', title: 'Test Stop', hat_dcode: '15TY' }],
      gpsConsent: 'pending',
    },
    setGpsConsent: vi.fn(),
  }),
  PINNED_STOPS_MAX: 5
}))
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ favorites: [{ kind: 'stop', id: '1234', title: 'Fav Stop' }] })
}))
vi.mock('@/hooks/useRecentSearches', () => ({
  getRecent: () => [{ type: 'route', id: '15TY', label: '15TY', timestamp: 1234 }]
}))
vi.mock('@/api/client', () => ({
  api: {
    stops: { nearby: vi.fn().mockResolvedValue([]), detail: vi.fn().mockResolvedValue({ dcode: '1234' }) },
    notices: {
      global: vi.fn().mockResolvedValue([]),
      official: vi.fn().mockResolvedValue({
        page: 0,
        total_items: 2,
        items: [
          {
            id: '3344',
            title: 'E59 Numaralı Hattımız Hakkında',
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            url: 'https://iett.istanbul/Announcement/Detail/3344',
          },
          {
            id: '3343',
            title: '29 Ekim Cumhuriyet Bayramında İETT Seferleri',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            url: 'https://iett.istanbul/Announcement/Detail/3343',
          },
        ],
      }),
    },
  },
}))

describe('Home', () => {
  it('renders correctly with data', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('Sabitlenmiş Duraklar')).toBeInTheDocument()
  })

  it('renders multiple active official announcements with İETT badge within 72h window', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for official announcements to be rendered
    expect(await screen.findByText('E59 Numaralı Hattımız Hakkında')).toBeInTheDocument()
    expect(await screen.findByText('29 Ekim Cumhuriyet Bayramında İETT Seferleri')).toBeInTheDocument()

    // Both announcements display the "İETT" badge
    const badges = screen.getAllByText('İETT')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })
})
