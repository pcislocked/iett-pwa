import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PinnedManagePage from '@/pages/PinnedManagePage'
import * as useUserPrefsModule from '@/hooks/useUserPrefs'
import * as useArrivalsModule from '@/hooks/useArrivals'
import { api, type StopDetail, type Arrival } from '@/api/client'

const realArrivals: Arrival[] = [
  {
    route_code: '500T',
    destination: 'TUZLA',
    eta_minutes: 4,
    eta_raw: '4 dk',
    plate: '34 HO 1000',
    kapino: 'B-1000',
    lat: 41.0,
    lon: 29.0,
    speed_kmh: 20,
    last_seen_ts: '14:35:00',
    amenities: { ac: true, usb: true, wifi: false, accessible: true },
  },
]

const realStopDetail: StopDetail = {
  dcode: '225652',
  name: 'KAVACIK AKTARMA',
  latitude: 41.09,
  longitude: 29.09,
  direction: 'KADIKÖY YÖNÜ',
}

describe('PinnedManagePage Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    vi.spyOn(api.stops, 'detail').mockResolvedValue(realStopDetail)
    vi.spyOn(useArrivalsModule, 'useArrivals').mockReturnValue({
      data: realArrivals,
      loading: false,
      error: null,
      refresh: vi.fn(),
      stale: false,
      lastUpdated: null,
      iettUpdatedAt: null,
    })
  })

  it('renders empty state when no stops are pinned', () => {
    vi.spyOn(useUserPrefsModule, 'useUserPrefs').mockReturnValue({
      prefs: { pinnedStops: [] } as unknown as useUserPrefsModule.UserPrefs,
      pinStop: vi.fn(),
      unpinStop: vi.fn(),
      isPinned: vi.fn().mockReturnValue(false),
    } as unknown as ReturnType<typeof useUserPrefsModule.useUserPrefs>)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PinnedManagePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Sabitlenmiş Duraklar')).toBeInTheDocument()
    expect(screen.getByText('Sabitlenmiş durak yok')).toBeInTheDocument()
  })

  it('renders pinned stops and handles unpinning in edit mode', async () => {
    const mockUnpin = vi.fn()
    vi.spyOn(useUserPrefsModule, 'useUserPrefs').mockReturnValue({
      prefs: {
        pinnedStops: [{ dcode: '225652', nick: 'Kavacık Aktarma', pinnedAt: Date.now() }],
      } as unknown as useUserPrefsModule.UserPrefs,
      pinStop: vi.fn(),
      unpinStop: mockUnpin,
      isPinned: vi.fn().mockReturnValue(true),
    } as unknown as ReturnType<typeof useUserPrefsModule.useUserPrefs>)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PinnedManagePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Kavacık Aktarma')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/KADIKÖY YÖNÜ/)).toBeInTheDocument()
    })

    // Click Edit button
    const editBtn = screen.getByText('Düzenle')
    fireEvent.click(editBtn)

    // Unpin button should appear
    const removeBtn = screen.getByLabelText(/Kaldır|Remove/i)
    fireEvent.click(removeBtn)

    expect(mockUnpin).toHaveBeenCalledWith('225652')
  })
})
