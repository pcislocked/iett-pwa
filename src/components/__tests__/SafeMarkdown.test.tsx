import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SafeMarkdown } from '../SafeMarkdown'

describe('SafeMarkdown', () => {
  it('renders bold, italic, and inline code formatting', () => {
    render(
      <MemoryRouter>
        <SafeMarkdown content="Bu bir **kalın** ve *italik* ve `kod` metnidir." />
      </MemoryRouter>
    )

    expect(screen.getByText('kalın').tagName).toBe('STRONG')
    expect(screen.getByText('italik').tagName).toBe('EM')
    expect(screen.getByText('kod').tagName).toBe('CODE')
  })

  it('renders relative internal links with React Router Link', () => {
    render(
      <MemoryRouter>
        <SafeMarkdown content="Detaylar için [Yenilikler](/changelog) sayfasına bakın." />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: 'Yenilikler' })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/changelog')
  })

  it('renders external links with target="_blank" and rel="noopener noreferrer"', () => {
    render(
      <MemoryRouter>
        <SafeMarkdown content="Bilgi için [İETT](https://iett.istanbul) sitesini ziyaret edin." />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /İETT/ })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('https://iett.istanbul')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders mailto links cleanly', () => {
    render(
      <MemoryRouter>
        <SafeMarkdown content="İletişim: [Bize Yazın](mailto:sa@pcislocked.net)" />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /Bize Yazın/ })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('mailto:sa@pcislocked.net')
  })

  it('neutralizes insecure links like javascript:', () => {
    render(
      <MemoryRouter>
        <SafeMarkdown content="Tehlikeli [tıkla](javascript:alert(1)) linki" />
      </MemoryRouter>
    )

    // Should not render as an anchor link
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/tıkla/)).toBeInTheDocument()
  })

  it('handles multiple paragraphs separated by newlines', () => {
    const { container } = render(
      <MemoryRouter>
        <SafeMarkdown content={"Paragraf 1\n\nParagraf 2"} />
      </MemoryRouter>
    )

    expect(container.querySelectorAll('p').length).toBe(2)
    expect(screen.getByText('Paragraf 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraf 2')).toBeInTheDocument()
  })
})
