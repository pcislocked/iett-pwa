import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChangelogPage from '../ChangelogPage'
import { LAST_SEEN_VERSION_KEY } from '@/hooks/useVersionBanner'

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
})
