import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MapSearchPanel from '../MapSearchPanel'
import { api, type RouteSearchResult, type StopSearchResult, type BusPosition } from '@/api/client'

const realRoutes: RouteSearchResult[] = [
  { hat_kodu: '500T', name: 'TUZLA ŞİFA - CEVİZLİBAĞ' },
  { hat_kodu: '15F', name: 'BEYKOZ - KADIKÖY' },
]

const realStops: StopSearchResult[] = [
  { dcode: '225652', name: 'KAVACIK AKTARMA', path: null },
  { dcode: '101010', name: 'MECİDİYEKÖY', path: null },
]

const realFleet: BusPosition[] = [
  {
    kapino: 'B-1000',
    plate: '34 HO 1000',
    route_code: '500T',
    route_name: 'TUZLA ŞİFA - CEVİZLİBAĞ',
    latitude: 41.0,
    longitude: 29.0,
    speed: 30,
    operator: 'İETT',
    nearest_stop: '225652',
    direction: 'D',
    direction_letter: 'D',
    stop_sequence: 10,
    last_seen: '14:35:00',
  },
]

describe('MapSearchPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(api.routes, 'search').mockResolvedValue(realRoutes)
    vi.spyOn(api.stops, 'search').mockResolvedValue(realStops)
  })

  it('renders search input and toggles fleet visibility', () => {
    const handleToggleFleet = vi.fn()

    render(
      <MapSearchPanel
        selectedRoutes={['500T']}
        selectedStops={[{ dcode: '225652', name: 'KAVACIK' }]}
        fleetVisible={true}
        busCount={150}
        fleet={realFleet}
        onAddRoute={vi.fn()}
        onRemoveRoute={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onToggleFleet={handleToggleFleet}
        onBusSearch={vi.fn()}
      />
    )

    expect(screen.getByPlaceholderText(/Hat, durak veya araç ara/i)).toBeInTheDocument()
    expect(screen.getByText('500T')).toBeInTheDocument()
    expect(screen.getByText(/KAVACIK/)).toBeInTheDocument()

    // Toggle fleet button
    const fleetBtn = screen.getByText('Filoyu Gizle')
    fireEvent.click(fleetBtn)
    expect(handleToggleFleet).toHaveBeenCalledTimes(1)
  })

  it('searches routes, stops, and fleet vehicles on typing query', async () => {
    const handleAddRoute = vi.fn()
    const handleAddStop = vi.fn()

    render(
      <MapSearchPanel
        selectedRoutes={[]}
        selectedStops={[]}
        fleetVisible={false}
        busCount={0}
        fleet={realFleet}
        onAddRoute={handleAddRoute}
        onRemoveRoute={vi.fn()}
        onAddStop={handleAddStop}
        onRemoveStop={vi.fn()}
        onToggleFleet={vi.fn()}
        onBusSearch={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/Hat, durak veya araç ara/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '500T' } })

    await waitFor(() => {
      expect(screen.getByText('TUZLA ŞİFA - CEVİZLİBAĞ')).toBeInTheDocument()
    })

    const routeOption = screen.getByText('TUZLA ŞİFA - CEVİZLİBAĞ')
    fireEvent.click(routeOption)
    expect(handleAddRoute).toHaveBeenCalledWith('500T')
  })
})
