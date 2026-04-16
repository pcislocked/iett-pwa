import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PinnedStopRow from '@/components/PinnedStopRow'
import { api } from '@/api/client'

vi.mock('@/hooks/useArrivals', () => ({
  useArrivals: () => ({
    data: [],
    loading: false,
    error: null,
    stale: false,
    lastUpdated: null,
    refresh: vi.fn(),
  }),
}))

let keySeq = 0
function uniqueDcode(prefix: string): string {
  keySeq += 1
  return `${prefix}-${keySeq}`
}

function renderRows(...rows: Array<{ dcode: string; nick: string }>) {
  return render(
    <MemoryRouter>
      <div>
        {rows.map((row) => (
          <PinnedStopRow key={row.dcode} dcode={row.dcode} nick={row.nick} />
        ))}
      </div>
    </MemoryRouter>,
  )
}

describe('PinnedStopRow stop-detail cache', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('dedupes in-flight stop detail requests for same stop code', async () => {
    const dcode = uniqueDcode('INF')

    let resolveDetail!: (value: { dcode: string; name: string; latitude: null; longitude: null; direction: string }) => void
    const detailPromise = new Promise<{ dcode: string; name: string; latitude: null; longitude: null; direction: string }>((resolve) => {
      resolveDetail = resolve
    })

    const detailSpy = vi.spyOn(api.stops, 'detail').mockReturnValue(detailPromise)

    renderRows(
      { dcode, nick: 'Row 1' },
      { dcode, nick: 'Row 2' },
    )

    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledTimes(1)
    })

    resolveDetail({ dcode, name: 'Stop', latitude: null, longitude: null, direction: 'Gidiş' })
    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('uses cached stop detail within TTL and refetches after TTL expiry', async () => {
    const dcode = uniqueDcode('TTL')
    let now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const detailSpy = vi.spyOn(api.stops, 'detail').mockResolvedValue({
      dcode,
      name: 'Stop',
      latitude: null,
      longitude: null,
      direction: 'Dönüş',
    })

    const first = renderRows({ dcode, nick: 'First' })
    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledTimes(1)
    })
    first.unmount()

    const withinTtl = renderRows({ dcode, nick: 'Second' })
    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledTimes(1)
    })
    withinTtl.unmount()

    now += 10 * 60 * 1000 + 1
    renderRows({ dcode, nick: 'Third' })
    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledTimes(2)
    })
  })
})
