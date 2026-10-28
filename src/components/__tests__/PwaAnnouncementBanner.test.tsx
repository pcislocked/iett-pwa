import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PwaAnnouncementBanner } from '../PwaAnnouncementBanner'
import type { PwaAnnouncement } from '@/types/announcements'

describe('PwaAnnouncementBanner', () => {
  const sampleAnnouncements: PwaAnnouncement[] = [
    {
      id: 1,
      date: '2026-10-28',
      startDate: '2026-10-27T00:00:00.000Z',
      endDate: '2026-10-29T23:59:59.000Z',
      title: 'Kritik Sistem Bakımı',
      isIgnorable: true,
      isSingleShow: false,
      content: 'Bu gece **02:00** sularında kesinti olabilir. Detay için [tıklayın](/changelog).',
    },
    {
      id: 2,
      date: '2026-10-28',
      startDate: '2026-10-27T00:00:00.000Z',
      endDate: '2026-10-29T23:59:59.000Z',
      title: 'Zorunlu Genel Bildiri',
      isIgnorable: false,
      isSingleShow: false,
      content: 'Kapatılamayan duyuru metni.',
    },
  ]

  it('renders nothing when announcements list is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <PwaAnnouncementBanner announcements={[]} onDismiss={vi.fn()} />
      </MemoryRouter>
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders announcements with [iett-pwa] tag, date, title, and markdown content', () => {
    render(
      <MemoryRouter>
        <PwaAnnouncementBanner announcements={sampleAnnouncements} onDismiss={vi.fn()} />
      </MemoryRouter>
    )

    // Tag and Date
    const tags = screen.getAllByText('iett-pwa')
    expect(tags.length).toBe(2)
    expect(screen.getAllByText('2026-10-28').length).toBe(2)

    // Titles
    expect(screen.getByText('Kritik Sistem Bakımı')).toBeInTheDocument()
    expect(screen.getByText('Zorunlu Genel Bildiri')).toBeInTheDocument()

    // Markdown content (bold and link)
    expect(screen.getByText('02:00').tagName).toBe('STRONG')
    const link = screen.getByRole('link', { name: 'tıklayın' })
    expect(link).toHaveAttribute('href', '/changelog')
  })

  it('shows close button for ignorable announcements and calls onDismiss with id', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <PwaAnnouncementBanner announcements={sampleAnnouncements} onDismiss={onDismiss} />
      </MemoryRouter>
    )

    // Only announcement 1 is ignorable, so there should be 1 close button
    const closeButtons = screen.getAllByRole('button', { name: 'Kapat' })
    expect(closeButtons.length).toBe(1)

    fireEvent.click(closeButtons[0])
    expect(onDismiss).toHaveBeenCalledWith(1)
  })
})
