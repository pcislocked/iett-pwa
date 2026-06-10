/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import StopPage from '@/pages/StopPage'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    stops: {
      detail: vi.fn(),
      arrivals: vi.fn(),
      routes: vi.fn(),
      announcements: vi.fn(),
    },
    routes: {
      announcements: vi.fn(),
    },
  },
}))

describe('StopPage Announcements', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  function renderPage(dcode = '1234') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/stops/${dcode}`]}>
          <Routes>
            <Route path="/stops/:dcode" element={<StopPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('fetches announcements for all routes at the stop and renders accordion', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234', name: 'Test Stop', latitude: 41, longitude: 29
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue([] as any)

    vi.mocked(api.stops.announcements).mockResolvedValue([
      { type: 'Duyuru', updated_at: '2026-06-05', message: '15TY is delayed', route_code: '15TY', route_name: '' },
      { type: 'Bilgi', updated_at: '2026-06-05', message: '11H extra bus added', route_code: '11H', route_name: '' }
    ])

    renderPage()

    // Wait for the accordion button to appear (2 announcements)
    const btn = await screen.findByRole('button', { name: /Duyurular \(2\)/i })
    expect(btn).toBeInTheDocument()

    // Expand accordion
    fireEvent.click(btn)

    // Verify announcements are rendered
    await waitFor(() => {
      expect(screen.getByText(/15TY is delayed/i)).toBeInTheDocument()
      expect(screen.getByText(/11H extra bus added/i)).toBeInTheDocument()
    })
  })

  it('shows fallback message when announcement fetch fails', async () => {
    vi.mocked(api.stops.detail).mockResolvedValue({
      dcode: '1234',
      name: 'Test Stop',
      direction: 'North',
      
      latitude: 41,
      longitude: 29
    })
    vi.mocked(api.stops.arrivals).mockResolvedValue([] as any)
    vi.mocked(api.stops.routes).mockResolvedValue(['15TY', '11H'])

    // Fails
    vi.mocked(api.stops.announcements).mockRejectedValue(new Error('API Error'))

    renderPage()

    // Should show 1 fallback announcement
    const btn = await screen.findByRole('button', { name: /Duyurular \(1\)/i })
    expect(btn).toBeInTheDocument()

    fireEvent.click(btn)

    // Verify fallback text
    await waitFor(() => {
      expect(screen.getByText(/Duyurular yüklenirken geçici bir hata oluştu/i)).toBeInTheDocument()
    })
  })
})


