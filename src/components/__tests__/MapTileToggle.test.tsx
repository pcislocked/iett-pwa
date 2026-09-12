import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapTileToggle from '../MapTileToggle'

describe('MapTileToggle Component', () => {
  it('renders current tile icon and triggers onToggle on click', () => {
    const handleToggle = vi.fn()

    const { rerender } = render(
      <MapTileToggle satellite={false} onToggle={handleToggle} />
    )

    expect(screen.getByText('🗺️')).toBeInTheDocument()

    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(handleToggle).toHaveBeenCalledTimes(1)

    // Rerender with satellite theme
    rerender(<MapTileToggle satellite={true} onToggle={handleToggle} />)
    expect(screen.getByText('🛰️')).toBeInTheDocument()
  })
})
