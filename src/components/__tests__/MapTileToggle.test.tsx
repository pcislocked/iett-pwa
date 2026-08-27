import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapTileToggle from '../MapTileToggle'

describe('MapTileToggle Component', () => {
  it('renders current tile icon and triggers onCycle on click', () => {
    const handleCycle = vi.fn()

    const { rerender } = render(
      <MapTileToggle tileIdx={0} onCycle={handleCycle} />
    )

    expect(screen.getByText('🌙')).toBeInTheDocument()

    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(handleCycle).toHaveBeenCalledTimes(1)

    // Rerender with light theme (idx 1)
    rerender(<MapTileToggle tileIdx={1} onCycle={handleCycle} />)
    expect(screen.getByText('☀️')).toBeInTheDocument()

    // Rerender with sat theme (idx 2)
    rerender(<MapTileToggle tileIdx={2} onCycle={handleCycle} />)
    expect(screen.getByText('🛰️')).toBeInTheDocument()
  })
})
