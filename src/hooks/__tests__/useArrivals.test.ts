import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, type Arrival } from '@/api/client'
import { useArrivals } from '../useArrivals'

let keySeq = 0
function uniqueKey(prefix: string): string {
  keySeq += 1
  return `${prefix}-${keySeq}`
}

function makeArrivals(routeCode: string): Arrival[] {
  return [
    {
      route_code: routeCode,
      destination: 'Dest',
      eta_minutes: 3,
      eta_raw: '3 dk',
      plate: null,
      kapino: null,
      lat: null,
      lon: null,
      speed_kmh: null,
      last_seen_ts: null,
      amenities: null,
    },
  ]
}

async function flushHookCycle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useArrivals', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reuses one in-flight request for concurrent hooks with same key', async () => {
    const dcode = uniqueKey('INF')

    let resolveReq!: (value: Arrival[]) => void
    const arrivalsPromise = new Promise<Arrival[]>((resolve) => {
      resolveReq = resolve
    })

    const arrivalsSpy = vi.spyOn(api.stops, 'arrivals').mockReturnValue(arrivalsPromise)

    const h1 = renderHook(() => useArrivals(dcode))
    const h2 = renderHook(() => useArrivals(dcode))

    await flushHookCycle()
    expect(arrivalsSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveReq(makeArrivals('A1'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(h1.result.current.data?.[0].route_code).toBe('A1')
    expect(h2.result.current.data?.[0].route_code).toBe('A1')

    h1.unmount()
    h2.unmount()
  })

  it('uses cached data within TTL without extra request', async () => {
    const dcode = uniqueKey('HIT')
    const arrivalsSpy = vi.spyOn(api.stops, 'arrivals').mockResolvedValue(makeArrivals('B1'))

    const h1 = renderHook(() => useArrivals(dcode))
    await flushHookCycle()
    expect(arrivalsSpy).toHaveBeenCalledTimes(1)
    h1.unmount()

    const h2 = renderHook(() => useArrivals(dcode))
    await flushHookCycle()
    expect(arrivalsSpy).toHaveBeenCalledTimes(1)
    h2.unmount()
  })

  it('refresh() forces network fetch even inside TTL', async () => {
    const dcode = uniqueKey('REF')
    const arrivalsSpy = vi.spyOn(api.stops, 'arrivals').mockResolvedValue(makeArrivals('C1'))

    const h = renderHook(() => useArrivals(dcode))
    await flushHookCycle()
    expect(arrivalsSpy).toHaveBeenCalledTimes(1)

    act(() => {
      h.result.current.refresh()
    })
    await flushHookCycle()

    expect(arrivalsSpy).toHaveBeenCalledTimes(2)
    h.unmount()
  })

  it('prunes old entries when cache exceeds max size', async () => {
    const prefix = uniqueKey('PRUNE')
    let now = 3_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const arrivalsSpy = vi.spyOn(api.stops, 'arrivals').mockImplementation(async (dcode: string) => makeArrivals(dcode))

    for (let i = 0; i < 241; i++) {
      const h = renderHook(() => useArrivals(`${prefix}-${i}`))
      await flushHookCycle()
      h.unmount()
      now += 1
    }

    expect(arrivalsSpy).toHaveBeenCalledTimes(241)

    const again = renderHook(() => useArrivals(`${prefix}-0`))
    await flushHookCycle()
    again.unmount()

    expect(arrivalsSpy).toHaveBeenCalledTimes(242)
  })
})
