import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ShareTargetPage from '@/pages/ShareTargetPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ShareTargetPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses route share link and navigates to /routes/:hatKodu', async () => {
    render(
      <MemoryRouter initialEntries={['/share-target?url=https%3A%2F%2Fiett.istanbul%2FRouteDetail%3Fhkod%3D500T']}>
        <Routes>
          <Route path="/share-target" element={<ShareTargetPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/routes/500T', { replace: true })
    })
  })

  it('parses stop share link and navigates to /stops/:dcode', async () => {
    render(
      <MemoryRouter initialEntries={['/share-target?url=https%3A%2F%2Fiett.istanbul%2FStationDetail%3Fdkod%3D220602']}>
        <Routes>
          <Route path="/share-target" element={<ShareTargetPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/stops/220602', { replace: true })
    })
  })

  it('falls back to home when share target query has no valid parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/share-target']}>
        <Routes>
          <Route path="/share-target" element={<ShareTargetPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('parses search share query and navigates to /search?q=...', async () => {
    render(
      <MemoryRouter initialEntries={['/share-target?text=Kad%C4%B1k%C3%B6y']}>
        <Routes>
          <Route path="/share-target" element={<ShareTargetPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/search?q=Kad%C4%B1k%C3%B6y', { replace: true })
    })
  })
})
