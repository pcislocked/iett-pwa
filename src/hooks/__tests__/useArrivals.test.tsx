/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useArrivals } from '@/hooks/useArrivals'
import { api } from '@/api/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/api/client', () => ({
  api: {
    stops: { arrivals: vi.fn() }
  }
}))

describe('useArrivals', () => {
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

  it('fetches arrivals when stopCode is provided', async () => {
    const mockData = [{ route_code: '15TY', eta_minutes: 5 }]
    vi.mocked(api.stops.arrivals).mockResolvedValue(mockData as any)

    const { result } = renderHook(() => useArrivals('1234'), { wrapper })

    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(api.stops.arrivals).toHaveBeenCalledWith('1234', undefined, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('handles error states', async () => {
    vi.mocked(api.stops.arrivals).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useArrivals('1234'), { wrapper })
    
    await waitFor(() => {
      expect(result.current.error).toContain('API Error')
    })
  })
})
