import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, type RouteMetadata, type ScheduledDeparture } from '@/api/client'
import { useRouteTickerData } from '../useRouteTickerData'

let codeSeq = 0
function uniqueCode(prefix: string): string {
  codeSeq += 1
  return `${prefix}-${codeSeq}`
}

function makeSchedule(code: string): ScheduledDeparture[] {
  return [
    {
      route_code: code,
      route_name: `Route ${code}`,
      route_variant: `${code}_G`,
      direction: 'G',
      day_type: 'H',
      service_type: 'normal',
      departure_time: '12:00',
    },
  ]
}

function makeMetadata(code: string): RouteMetadata[] {
  return [
    {
      hat_kodu: code,
      direction_name: 'A - B',
      full_name: 'A - B',
      variant_code: `${code}_G_G0`,
      direction: 0,
      depar_no: 1,
    },
  ]
}

async function flushPollingCycle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useRouteTickerData', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reuses a single in-flight request for concurrent consumers of the same route', async () => {
    const code = uniqueCode('INF')

    let resolveSchedule!: (value: ScheduledDeparture[]) => void
    let resolveMetadata!: (value: RouteMetadata[]) => void
    const schedulePromise = new Promise<ScheduledDeparture[]>((resolve) => {
      resolveSchedule = resolve
    })
    const metadataPromise = new Promise<RouteMetadata[]>((resolve) => {
      resolveMetadata = resolve
    })

    const scheduleSpy = vi.spyOn(api.routes, 'schedule').mockReturnValue(schedulePromise)
    const metadataSpy = vi.spyOn(api.routes, 'metadata').mockReturnValue(metadataPromise)

    const h1 = renderHook(() => useRouteTickerData(code))
    const h2 = renderHook(() => useRouteTickerData(code))

    await flushPollingCycle()
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(metadataSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSchedule(makeSchedule(code))
      resolveMetadata(makeMetadata(code))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(h1.result.current.data?.schedule[0].route_code).toBe(code)
    expect(h2.result.current.data?.schedule[0].route_code).toBe(code)

    h1.unmount()
    h2.unmount()
  })

  it('serves cached data within TTL without re-fetching', async () => {
    const code = uniqueCode('HIT')
    const scheduleSpy = vi.spyOn(api.routes, 'schedule').mockResolvedValue(makeSchedule(code))
    const metadataSpy = vi.spyOn(api.routes, 'metadata').mockResolvedValue(makeMetadata(code))

    const h1 = renderHook(() => useRouteTickerData(code))
    await flushPollingCycle()
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(metadataSpy).toHaveBeenCalledTimes(1)
    h1.unmount()

    const h2 = renderHook(() => useRouteTickerData(code))
    await flushPollingCycle()
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(metadataSpy).toHaveBeenCalledTimes(1)
    h2.unmount()
  })

  it('re-fetches after TTL expires', async () => {
    const code = uniqueCode('TTL')
    let now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const scheduleSpy = vi.spyOn(api.routes, 'schedule').mockResolvedValue(makeSchedule(code))
    const metadataSpy = vi.spyOn(api.routes, 'metadata').mockResolvedValue(makeMetadata(code))

    const h1 = renderHook(() => useRouteTickerData(code))
    await flushPollingCycle()
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(metadataSpy).toHaveBeenCalledTimes(1)
    h1.unmount()

    now += (5 * 60 * 1000) + 1

    const h2 = renderHook(() => useRouteTickerData(code))
    await flushPollingCycle()
    expect(scheduleSpy).toHaveBeenCalledTimes(2)
    expect(metadataSpy).toHaveBeenCalledTimes(2)
    h2.unmount()
  })

  it('evicts oldest entries when cache exceeds max size', async () => {
    const prefix = `${uniqueCode('PRUNE')}-`
    let now = 2_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const scheduleSpy = vi.spyOn(api.routes, 'schedule').mockImplementation(async (code: string) => makeSchedule(code))
    vi.spyOn(api.routes, 'metadata').mockImplementation(async (code: string) => makeMetadata(code))

    for (let i = 0; i < 121; i++) {
      const h = renderHook(() => useRouteTickerData(`${prefix}${i}`))
      await flushPollingCycle()
      h.unmount()
      now += 1
    }

    expect(scheduleSpy).toHaveBeenCalledTimes(121)

    const again = renderHook(() => useRouteTickerData(`${prefix}0`))
    await flushPollingCycle()
    again.unmount()

    expect(scheduleSpy).toHaveBeenCalledTimes(122)
  })
})
