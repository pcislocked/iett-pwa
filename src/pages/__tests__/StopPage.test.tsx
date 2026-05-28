/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StopPage from '@/pages/StopPage'

const mocks = vi.hoisted(() => ({
  useArrivals: vi.fn(),
  usePolling: vi.fn(),
  useFavorites: vi.fn(() => ({ isFavorite: () => false, toggle: vi.fn() })),
  useUserPrefs: vi.fn(() => ({ prefs: { pinnedStops: [] }, isPinned: () => false, pinStop: vi.fn(), unpinStop: vi.fn() })),
}))

vi.mock('@/hooks/useArrivals', () => ({ useArrivals: mocks.useArrivals }))
vi.mock('@/hooks/usePolling', () => ({ usePolling: mocks.usePolling }))
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: mocks.useFavorites }))
vi.mock('@/hooks/useUserPrefs', () => ({
  useUserPrefs: mocks.useUserPrefs,
  PINNED_STOPS_MAX: 5,
}))
vi.mock('@/hooks/useBottomBar', () => ({ useBottomBar: vi.fn() }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div />,
  Marker: ({ children }: any) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  CircleMarker: () => <div data-testid="circle-marker" />,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('StopPage', () => {
  function renderPage(entry = '/stops/1002') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/stops/:dcode" element={<StopPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  function setupMocks(options: any = {}) {
    mocks.useArrivals.mockReturnValue({
      data: options.arrivals !== undefined ? options.arrivals : [
        { route_code: '15TY', destination: 'HEKİMBAŞI', eta_minutes: 10, kapino: 'B123', plate: '34ABC123', sequence: 1 },
      ],
      loading: options.arrivalsLoading || false,
      error: options.arrivalsError || null,
      stale: options.arrivalsStale || false,
      refresh: vi.fn(),
      lastUpdated: options.lastUpdated !== undefined ? options.lastUpdated : new Date('2026-05-23T04:00:00.000Z'),
      iettUpdated: options.iettUpdated !== undefined ? options.iettUpdated : new Date('2026-05-23T03:59:00.000Z'),
    })

    let callCount = 0
    mocks.usePolling.mockImplementation(() => {
      const index = callCount % 3
      callCount++
      if (index === 0) { // routes
        return {
          data: options.routes !== undefined ? options.routes : ['15TY'],
          error: null,
          refresh: vi.fn(),
        }
      }
      if (index === 1) { // stopDetail
        return {
          data: options.stopDetail !== undefined ? options.stopDetail : {
            code: '1002',
            name: 'Test Stop 2',
            lat: 41.1,
            lon: 29.1,
          },
          error: null,
          refresh: vi.fn(),
        }
      }
      if (index === 2) { // announcements
        return {
          data: options.announcements !== undefined ? options.announcements : [],
          error: null,
          refresh: vi.fn(),
        }
      }
    })
  }

  it('renders stop name and arrivals correctly', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('Test Stop 2')).toBeInTheDocument()
    expect(screen.getAllByText('15TY')[0]).toBeInTheDocument()
    expect(screen.getByText('HEKİMBAŞI')).toBeInTheDocument()
  })

  it('displays the secondary IETT source timestamp when available', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText(/güncellendi: 07:00/i)).toBeInTheDocument() // 04:00Z formatted in local time +3
    expect(screen.getByText(/, İETT: 06:59/i)).toBeInTheDocument() // 03:59Z formatted in local time +3
  })

  it('opens and closes the Zaman Damgaları InfoModal via backdrop click', () => {
    setupMocks()
    renderPage()

    // Trigger opening the InfoModal by clicking the 'i' button
    const infoBtn = screen.getByLabelText('Neden iki farklı saat var?')
    expect(infoBtn).toBeInTheDocument()
    fireEvent.click(infoBtn)

    // Modal should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Zaman Damgaları')).toBeInTheDocument()

    // Close the modal by clicking the backdrop
    const backdrop = screen.getByText('Zaman Damgaları').closest('.fixed')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)

    // Modal should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes InfoModal when clicking the Anladım button', () => {
    setupMocks()
    renderPage()

    const infoBtn = screen.getByLabelText('Neden iki farklı saat var?')
    fireEvent.click(infoBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: 'Anladım' })
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('traps focus in InfoModal and includes scrollable description', () => {
    setupMocks()
    renderPage()

    const infoBtn = screen.getByLabelText('Neden iki farklı saat var?')
    fireEvent.click(infoBtn)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    // Should have description div (tabIndex=0) and Anladım button (button)
    expect(focusable.length).toBe(2)
    const desc = focusable[0]
    const button = focusable[1]

    expect(desc).toHaveAttribute('id', 'info-desc')
    expect(button).toHaveTextContent('Anladım')

    // Start with focus on the last element (Anladım button)
    button.focus()
    // Tab forwards should wrap to the first element (description)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(desc)

    // Tab backwards from first element should wrap to the last element (Anladım button)
    desc.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(button)
  })

  it('traps focus in AnnouncementsModal and includes scrollable announcements list', () => {
    setupMocks({
      announcements: [
        { route_code: '15TY', route_name: 'HEKİMBAŞI', type: 'Duyuru', updated_at: '2026-05-23T04:00:00Z', message: 'Test announcement' }
      ]
    })
    renderPage()

    // Trigger opening announcements modal
    const annBtn = screen.getByRole('button', { name: /1 duyuru/i })
    expect(annBtn).toBeInTheDocument()
    fireEvent.click(annBtn)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    // Should have: close icon button, announcements list (tabIndex=0), and bottom Close button
    expect(focusable.length).toBe(3)
    const closeIcon = focusable[0]
    const list = focusable[1]
    const closeBtn = focusable[2]

    expect(closeIcon).toHaveAttribute('aria-label', 'Kapat')
    expect(list).toHaveAttribute('aria-label', 'Duyurular listesi')
    expect(closeBtn).toHaveTextContent('Kapat')

    // Start at bottom Close button
    closeBtn.focus()
    // Tab forwards should wrap to Close icon button
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(closeIcon)

    // Tab backwards from Close icon button should wrap to bottom Close button
    closeIcon.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(closeBtn)

    // Escape should close modal
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
