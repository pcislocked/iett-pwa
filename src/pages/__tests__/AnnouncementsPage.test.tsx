import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AnnouncementsPage from '@/pages/AnnouncementsPage'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    notices: {
      official: vi.fn(),
      global: vi.fn(),
    },
  },
}))

describe('AnnouncementsPage Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
  })

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AnnouncementsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders all announcements by default with four tabs', async () => {
    vi.mocked(api.notices.official).mockResolvedValue({
      page: 0,
      total_items: 2,
      items: [
        {
          id: '1',
          title: '500T Güzergah Değişikliği',
          date: '18.10.2026',
          url: 'https://iett.istanbul/duyuru-1',
        },
        {
          id: '2',
          title: '15F Ek Sefer',
          date: '18.10.2026',
          url: 'https://iett.istanbul/duyuru-2',
        },
      ],
    })
    vi.mocked(api.notices.global).mockResolvedValue([
      {
        notice_noticeid: '99',
        notice_title: 'Sistem Bakımı',
        notice_body: 'Gece saatlerinde sunucu bakımı yapılacaktır.',
        notice_starttime: 1700000000,
        notice_endtime: 1800000000,
        notice_imageid: null,
        page_name: 'home',
        page_pageid: '1',
      },
    ])

    renderPage()

    // 4 tabs exist
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    await waitFor(() => {
      expect(screen.getByText('500T Güzergah Değişikliği')).toBeInTheDocument()
      expect(screen.getByText('15F Ek Sefer')).toBeInTheDocument()
      expect(screen.getByText('Sistem Bakımı')).toBeInTheDocument()
    })

    // "Tüm Duyurular (İETT)" external link exists in place of pagination
    const allOfficialLink = screen.getByText('Tüm Duyurular (İETT)').closest('a')
    expect(allOfficialLink).toHaveAttribute('href', 'https://iett.istanbul/announcement/Index')
  })

  it('switches to official (İETT) tab', async () => {
    vi.mocked(api.notices.official).mockResolvedValue({
      page: 0,
      total_items: 1,
      items: [
        {
          id: '1',
          title: '500T Güzergah Değişikliği',
          date: '18.10.2026',
          url: 'https://iett.istanbul/duyuru-1',
        },
      ],
    })
    vi.mocked(api.notices.global).mockResolvedValue([
      {
        notice_noticeid: '99',
        notice_title: 'Sistem Bakımı',
        notice_body: 'Gece saatlerinde sunucu bakımı yapılacaktır.',
        notice_starttime: 1700000000,
        notice_endtime: 1800000000,
        notice_imageid: null,
        page_name: 'home',
        page_pageid: '1',
      },
    ])

    renderPage()

    const tabs = screen.getAllByRole('tab')
    const iettTab = tabs[1] // İETT tab
    fireEvent.click(iettTab)

    expect(iettTab).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => {
      expect(screen.getByText('500T Güzergah Değişikliği')).toBeInTheDocument()
      expect(screen.queryByText('Sistem Bakımı')).not.toBeInTheDocument()
    })
  })

  it('switches to system (NTC) tab and shows global notices', async () => {
    vi.mocked(api.notices.official).mockResolvedValue({ page: 0, total_items: 0, items: [] })
    vi.mocked(api.notices.global).mockResolvedValue([
      {
        notice_noticeid: '1',
        notice_title: 'Sistem Bakımı',
        notice_body: 'Gece saatlerinde sunucu bakımı yapılacaktır.',
        notice_starttime: 1700000000,
        notice_endtime: 1800000000,
        notice_imageid: null,
        page_name: 'home',
        page_pageid: '1',
      },
    ])

    renderPage()

    const tabs = screen.getAllByRole('tab')
    const ntcTab = tabs[2] // NTC tab
    fireEvent.click(ntcTab)

    expect(ntcTab).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => {
      expect(screen.getByText(/Sistem Bakımı/i)).toBeInTheDocument()
    })
  })

  it('switches to developer (PWA) tab', async () => {
    vi.mocked(api.notices.official).mockResolvedValue({ page: 0, total_items: 0, items: [] })
    vi.mocked(api.notices.global).mockResolvedValue([])

    renderPage()

    const tabs = screen.getAllByRole('tab')
    const pwaTab = tabs[3] // PWA tab
    fireEvent.click(pwaTab)

    expect(pwaTab).toHaveAttribute('aria-selected', 'true')
  })
})
