import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFleet, useRouteBuses } from '@/hooks/useFleet'
import { api } from '@/api/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/api/client', () => ({
  api: {
    fleet: { all: vi.fn() },
    routes: { buses: vi.fn() }
  }
}))

describe('useFleet', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
      }
    })
  })

  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('fetches all fleet data and maps state correctly', async () => {
    const mockData = [{ route_code: '15TY', kapino: 'K123' }]
    vi.mocked(api.fleet.all).mockResolvedValue(mockData as any)

    const { result } = renderHook(() => useFleet(), { wrapper })

    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(result.current.stale).toBe(false)
  })

  it('handles fleet API errors correctly', async () => {
    vi.mocked(api.fleet.all).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useFleet(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toContain('Network error')
    expect(result.current.data).toBeNull()
  })

  it('fetches route buses only when hatKodu is provided', async () => {
    const mockData = [{ route_code: '11H', kapino: 'K456' }]
    vi.mocked(api.routes.buses).mockResolvedValue(mockData as any)

    const { result, rerender } = renderHook(({ hk }) => useRouteBuses(hk), { 
      initialProps: { hk: '' },
      wrapper 
    })

    // Should not fetch if hk is empty
    expect(result.current.loading).toBe(false)
    expect(api.routes.buses).not.toHaveBeenCalled()

    // Rerender with hatKodu
    rerender({ hk: '11H' })
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockData)
    })
    
    expect(api.routes.buses).toHaveBeenCalledWith('11H')
  })
})
