import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LocationConsentModal from '@/components/LocationConsentModal'

describe('LocationConsentModal', () => {
  it('renders consent heading', () => {
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('renders privacy description', () => {
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/konumunuz pcislocked.net/i)).toBeInTheDocument()
  })

  it('calls onConfirm when primary button is clicked', () => {
    const onConfirm = vi.fn()
    render(<LocationConsentModal onConfirm={onConfirm} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /konumumu kullan/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when secondary button is clicked', () => {
    const onDismiss = vi.fn()
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /haritadan belirt/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when Escape is pressed', () => {
    const onDismiss = vi.fn()
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('has dialog role and aria-modal', () => {
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('traps focus: Tab from last button wraps to first', () => {
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    const focusable = screen.getByRole('dialog').querySelectorAll<HTMLElement>('button, a')
    const last = focusable[focusable.length - 1]
    last.focus()
    const defaultWasPrevented = !fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(defaultWasPrevented).toBe(true)
    expect(document.activeElement).toBe(focusable[0])
  })

  it('traps focus: Shift+Tab from first button wraps to last', () => {
    render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    const focusable = screen.getByRole('dialog').querySelectorAll<HTMLElement>('button, a')
    focusable[0].focus()
    const defaultWasPrevented = !fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(defaultWasPrevented).toBe(true)
    expect(document.activeElement).toBe(focusable[focusable.length - 1])
  })

  it('restores focus to previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { unmount } = render(<LocationConsentModal onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    unmount()

    expect(document.activeElement).toBe(trigger)
    document.body.removeChild(trigger)
  })
})
