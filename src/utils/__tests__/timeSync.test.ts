import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncServerTime, getServerOffsetMs, resetServerOffsetForTesting } from '../timeSync'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    system: {
      time: vi.fn(),
    },
  },
}))

describe('timeSync', () => {
  beforeEach(() => {
    resetServerOffsetForTesting()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('calculates offset correctly with timestamp_ms and RTT', async () => {
    let nowCounter = 1000000 // t0 = 1000000
    vi.spyOn(Date, 'now').mockImplementation(() => {
      const val = nowCounter
      nowCounter += 100 // t1 will be 1000100 -> RTT = 100ms, midpoint = 1000050
      return val
    })

    // Suppose server epoch ms was 1000050 at midpoint -> offset should be 0
    vi.mocked(api.system.time).mockResolvedValueOnce({
      status: 'ok',
      iso: '2026-10-23T11:22:33Z',
      time: '14:22:33',
      timestamp: 1000,
      timestamp_ms: 1000050,
      timezone: 'Europe/Istanbul',
    })

    const offset = await syncServerTime()
    expect(offset).toBe(0)
    expect(getServerOffsetMs()).toBe(0)
  })

  it('calculates positive offset when server clock is ahead', async () => {
    let nowCounter = 1000000
    vi.spyOn(Date, 'now').mockImplementation(() => {
      const val = nowCounter
      nowCounter += 60 // RTT = 60ms, midpoint = 1000030
      return val
    })

    // Server is at 1002030 (2000ms ahead)
    vi.mocked(api.system.time).mockResolvedValueOnce({
      status: 'ok',
      iso: '2026-10-23T11:22:35Z',
      time: '14:22:35',
      timestamp: 1002,
      timestamp_ms: 1002030,
      timezone: 'Europe/Istanbul',
    })

    const offset = await syncServerTime()
    expect(offset).toBe(2000)
    expect(getServerOffsetMs()).toBe(2000)
  })

  it('falls back to iso string parsing when timestamp_ms is missing', async () => {
    let nowCounter = 1000000
    vi.spyOn(Date, 'now').mockImplementation(() => {
      const val = nowCounter
      nowCounter += 40 // RTT = 40, midpoint = 1000020
      return val
    })

    const targetIso = new Date(1000520).toISOString()
    vi.mocked(api.system.time).mockResolvedValueOnce({
      status: 'ok',
      iso: targetIso,
      time: '14:22:35',
      timestamp: 1000,
      timezone: 'Europe/Istanbul',
    })

    const offset = await syncServerTime()
    expect(offset).toBe(500) // 1000520 - 1000020 = 500
  })

  it('handles API errors gracefully without throwing', async () => {
    vi.mocked(api.system.time).mockRejectedValueOnce(new Error('Network error'))

    const offset = await syncServerTime()
    expect(offset).toBeNull()
    expect(getServerOffsetMs()).toBeNull()
  })
})
