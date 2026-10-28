import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChangelogPage from '../ChangelogPage'
import { LAST_SEEN_VERSION_KEY } from '@/hooks/useVersionBanner'
import { getCurrentAppVersion } from '@/utils/appUpdate'

describe('ChangelogPage Component', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders changelog title and fallback releases', async () => {
    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>
    )

    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent(/Sürüm Geçmişi|Changelog/i)

    await waitFor(() => {
      expect(screen.getByTestId('changelog-item-0.4.11')).toBeInTheDocument()
    })
  })

  it('ensures current version is stored in localStorage when visited', async () => {
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBeNull()

    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBeTruthy()
    })
  })

  it('updates localStorage to current version when visited with an older version present', async () => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.4.11')

    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe(getCurrentAppVersion())
    })
  })

  it('fetches and renders releases from changelog.json', async () => {
    const mockPayload = {
      releases: [
        {
          version: '0.4.12',
          date: '2026-10-29',
          title: { tr: 'Özel Test Sürümü', en: 'Custom Test Release' },
          changes: { tr: ['Yenilik 1', 'Düzeltme 2'], en: ['Feature 1', 'Fix 2'] },
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('changelog.json')) {
        return Promise.resolve(new Response(JSON.stringify(mockPayload), { status: 200 }))
      }
      return Promise.reject(new Error('Network error'))
    })

    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('changelog-item-0.4.12')).toBeInTheDocument()
      expect(screen.getByText('Özel Test Sürümü')).toBeInTheDocument()
    })
  })

  it('handles fetch failure and offline mode gracefully with fallback data', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'))

    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('changelog-item-0.4.11')).toBeInTheDocument()
    })
  })
})
