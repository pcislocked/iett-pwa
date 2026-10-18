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

  it('renders official announcements and filters by search text', async () => {
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
    vi.mocked(api.notices.global).mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('500T Güzergah Değişikliği')).toBeInTheDocument()
      expect(screen.getByText('15F Ek Sefer')).toBeInTheDocument()
    })

    // Filter by text
    const searchInput = screen.getByPlaceholderText(/ara/i)
    fireEvent.change(searchInput, { target: { value: '500T' } })

    expect(screen.getByText('500T Güzergah Değişikliği')).toBeInTheDocument()
    expect(screen.queryByText('15F Ek Sefer')).not.toBeInTheDocument()
  })

  it('switches to system announcements tab and shows global notices', async () => {
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

    // Switch tab to Sistem Uyarıları
    const systemTab = screen.getByRole('tab', { name: /uyarı/i })
    fireEvent.click(systemTab)

    await waitFor(() => {
      expect(screen.getByText(/Sistem Bakımı/i)).toBeInTheDocument()
    })
  })
})
