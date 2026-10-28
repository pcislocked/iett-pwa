import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UpdateBanner from '../UpdateBanner'

describe('UpdateBanner Component', () => {
  it('renders correctly with formatted version text', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <UpdateBanner
          oldVersion="0.4.11"
          newVersion="0.4.11.1"
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    )

    const banner = screen.getByTestId('app-update-banner')
    expect(banner).toBeInTheDocument()
    expect(screen.getByText(/0\.4\.11.*0\.4\.11\.1/)).toBeInTheDocument()
  })

  it('has high-DPI single line capping CSS classes', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <UpdateBanner
          oldVersion="0.4.11"
          newVersion="0.4.11.1"
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    )

    const banner = screen.getByTestId('app-update-banner')
    expect(banner).toHaveClass('whitespace-nowrap')
    expect(banner).toHaveClass('overflow-hidden')
    expect(banner).toHaveClass('h-7')

    const link = banner.querySelector('a')
    expect(link).toHaveClass('truncate')
    expect(link).toHaveClass('min-w-0')
  })

  it('triggers onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <UpdateBanner
          oldVersion="0.4.11"
          newVersion="0.4.11.1"
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    )

    const closeBtn = screen.getByTestId('app-update-banner-close')
    fireEvent.click(closeBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('triggers onDismiss when banner link is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <UpdateBanner
          oldVersion="0.4.11"
          newVersion="0.4.11.1"
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/changelog')
    fireEvent.click(link)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
