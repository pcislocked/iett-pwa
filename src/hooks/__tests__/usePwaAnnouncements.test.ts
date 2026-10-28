import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePwaAnnouncements } from '../usePwaAnnouncements'
import type { PwaAnnouncementsData } from '@/types/announcements'

describe('usePwaAnnouncements', () => {
  let queryClient: QueryClient

  const mockData: PwaAnnouncementsData = {
    announcements: [
      {
        id: 1,
        date: '2026-10-28',
        startDate: '2026-10-27T00:00:00.000Z',
        endDate: '2026-10-29T23:59:59.000Z',
        title: 'Aktif Duyuru 1',
        isIgnorable: true,
        isSingleShow: false,
        content: 'İçerik 1',
      },
      {
        id: 2,
        date: '2026-10-28',
        startDate: '2026-10-30T00:00:00.000Z',
        endDate: '2026-11-05T23:59:59.000Z',
        title: 'Gelecek Duyuru (Görünmemeli)',
        isIgnorable: false,
        isSingleShow: false,
        content: 'Gelecek İçerik',
      },
      {
        id: 3,
        date: '2026-10-25',
        startDate: '2026-10-20T00:00:00.000Z',
        endDate: '2026-10-26T23:59:59.000Z',
        title: 'Geçmiş Duyuru (Görünmemeli)',
        isIgnorable: false,
        isSingleShow: false,
        content: 'Geçmiş İçerik',
      },
      {
        id: 4,
        date: '2026-10-28',
        startDate: '2026-10-27T00:00:00.000Z',
        endDate: '2026-10-29T23:59:59.000Z',
        title: 'Tek Seferlik Duyuru (Single Show)',
        isIgnorable: false,
        isSingleShow: true,
        content: 'Tek Sefer İçerik',
      },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })
    // Mock system time to 2026-10-28T12:00:00Z
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-28T12:00:00.000Z'))

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  it('filters announcements to active date window and shows them', async () => {
    const { result } = renderHook(() => usePwaAnnouncements(), { wrapper })

    await waitFor(() => {
      expect(result.current.announcements.length).toBe(2)
    })

    const ids = result.current.announcements.map((a) => a.id)
    expect(ids).toContain(1)
    expect(ids).toContain(4)
    expect(ids).not.toContain(2)
    expect(ids).not.toContain(3)
  })

  it('allows dismissing an ignorable announcement and persists to localStorage', async () => {
    const { result } = renderHook(() => usePwaAnnouncements(), { wrapper })

    await waitFor(() => {
      expect(result.current.announcements.some((a) => a.id === 1)).toBe(true)
    })

    act(() => {
      result.current.dismissAnnouncement(1)
    })

    expect(result.current.announcements.some((a) => a.id === 1)).toBe(false)
    const stored = JSON.parse(localStorage.getItem('iett_dismissed_pwa_announcements') || '[]')
    expect(stored).toContain(1)
  })

  it('records single-show announcements as seen in localStorage', async () => {
    const { result } = renderHook(() => usePwaAnnouncements(), { wrapper })

    await waitFor(() => {
      expect(result.current.announcements.length).toBe(2)
    })

    const seenStored = JSON.parse(localStorage.getItem('iett_seen_single_pwa_announcements') || '[]')
    expect(seenStored).toContain(4)
  })

  it('shows all announcements including expired and dismissed when includeAll is true', async () => {
    localStorage.setItem('iett_dismissed_pwa_announcements', JSON.stringify([1]))
    const { result } = renderHook(() => usePwaAnnouncements({ includeAll: true }), { wrapper })

    await waitFor(() => {
      expect(result.current.announcements.length).toBe(4)
    })

    const ids = result.current.announcements.map((a) => a.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })
})
