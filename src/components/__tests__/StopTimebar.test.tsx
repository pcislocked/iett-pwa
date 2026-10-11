import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { StopTimebar } from '../StopTimebar'

describe('StopTimebar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading state when lastUpdated is null', () => {
    render(
      <StopTimebar
        lastUpdated={null}
        iettUpdatedAt={null}
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="standard"
        showCurrentTime={false}
      />
    )
    expect(screen.getByText(/Yükleniyor/i)).toBeInTheDocument()
  })

  it('renders standard timebar with client and iett timestamps', () => {
    const fixedNow = new Date('2026-03-01T12:00:00Z')
    vi.setSystemTime(fixedNow)

    const lastUpdated = new Date(fixedNow.getTime() - 10_000) // 10s ago
    const iettUpdated = new Date(fixedNow.getTime() - 25_000).toISOString() // 25s ago

    render(
      <StopTimebar
        lastUpdated={lastUpdated}
        iettUpdatedAt={iettUpdated}
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="standard"
        showCurrentTime={false}
      />
    )

    expect(screen.getByText(/güncelleme:/i)).toBeInTheDocument()
    expect(screen.getByText(/iett:/i)).toBeInTheDocument()
  })

  it('renders compact and emoji formats correctly', () => {
    const fixedNow = new Date('2026-03-01T12:00:00Z')
    vi.setSystemTime(fixedNow)

    const lastUpdated = new Date(fixedNow.getTime() - 5_000)
    const iettUpdated = new Date(fixedNow.getTime() - 12_000).toISOString()

    const { rerender } = render(
      <StopTimebar
        lastUpdated={lastUpdated}
        iettUpdatedAt={iettUpdated}
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="compact"
        showCurrentTime={false}
      />
    )

    expect(screen.getByText('-5s')).toBeInTheDocument()
    expect(screen.getByText('-12s')).toBeInTheDocument()

    rerender(
      <StopTimebar
        lastUpdated={lastUpdated}
        iettUpdatedAt={iettUpdated}
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="emoji"
        showCurrentTime={false}
      />
    )

    expect(screen.getByText(/🔄 -5s/)).toBeInTheDocument()
    expect(screen.getByText(/📡 -12s/)).toBeInTheDocument()
  })

  it('renders live clock when showCurrentTime is true', () => {
    const fixedNow = new Date('2026-03-01T14:05:08')
    vi.setSystemTime(fixedNow)

    render(
      <StopTimebar
        lastUpdated={new Date()}
        iettUpdatedAt={null}
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="standard"
        showCurrentTime={true}
      />
    )

    expect(screen.getByText(/14:05:08/)).toBeInTheDocument()

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByText(/14:05:10/)).toBeInTheDocument()
  })

  it('calls onShowInfo when info button is clicked', () => {
    const onShowInfo = vi.fn()
    render(
      <StopTimebar
        lastUpdated={new Date()}
        iettUpdatedAt="2026-03-01T12:00:00Z"
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="standard"
        showCurrentTime={false}
        onShowInfo={onShowInfo}
      />
    )

    const infoBtn = screen.getByRole('button', { name: /Neden iki farklı saat var\?/i })
    fireEvent.click(infoBtn)
    expect(onShowInfo).toHaveBeenCalledTimes(1)
  })

  it('pauses and resumes timer on document visibilitychange', () => {
    const fixedNow = new Date('2026-03-01T10:00:00')
    vi.setSystemTime(fixedNow)

    render(
      <StopTimebar
        lastUpdated={new Date()}
        iettUpdatedAt={null}
        maxGpsTime={null}
        timestampMode="relative"
        timebarFormat="standard"
        showCurrentTime={true}
      />
    )

    expect(screen.getByText(/10:00:00/)).toBeInTheDocument()

    // Simulate tab hiding
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    fireEvent(document, new Event('visibilitychange'))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Clock should not have advanced via interval while hidden
    expect(screen.getByText(/10:00:00/)).toBeInTheDocument()

    // Simulate tab becoming visible again
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    fireEvent(document, new Event('visibilitychange'))

    // Now it updates immediately on tab focus
    expect(screen.getByText(/10:00:05/)).toBeInTheDocument()
  })
})
