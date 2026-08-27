import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PullToRefresh from '../PullToRefresh'

describe('PullToRefresh Component', () => {
  it('renders children correctly', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div data-testid="child-content">Child Content</div>
      </PullToRefresh>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('triggers onRefresh when touch pull exceeds threshold', async () => {
    const handleRefresh = vi.fn().mockResolvedValue(undefined)

    const { container } = render(
      <PullToRefresh onRefresh={handleRefresh}>
        <div>Scrollable Content</div>
      </PullToRefresh>
    )

    const scrollContainer = container.firstElementChild as HTMLElement
    expect(scrollContainer).not.toBeNull()

    // Simulate pull gesture: start at 100, move to 300 (dy = 200, pull = 100 > threshold 60)
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    })

    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 300 }],
      cancelable: true,
    })

    await act(async () => {
      fireEvent.touchEnd(scrollContainer)
    })

    expect(handleRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not trigger onRefresh when touch pull is below threshold', async () => {
    const handleRefresh = vi.fn().mockResolvedValue(undefined)

    const { container } = render(
      <PullToRefresh onRefresh={handleRefresh}>
        <div>Scrollable Content</div>
      </PullToRefresh>
    )

    const scrollContainer = container.firstElementChild as HTMLElement

    // Small pull: start at 100, move to 130 (dy = 30, pull = 15 < threshold 60)
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    })

    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 130 }],
    })

    await act(async () => {
      fireEvent.touchEnd(scrollContainer)
    })

    expect(handleRefresh).not.toHaveBeenCalled()
  })
})
