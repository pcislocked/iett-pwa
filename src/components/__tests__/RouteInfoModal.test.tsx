import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RouteInfoModal from '../RouteInfoModal'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    routes: {
      info: vi.fn(),
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const dict: Record<string, string> = {
        'routes.info': 'Hat Bilgisi',
        'common.close': 'Kapat',
        'common.loading': 'Yükleniyor...',
        'routes.duration': 'Sefer Süresi',
        'common.minutes': 'dk',
        'routes.type': 'Hat Tipi',
        'routes.tariff': 'Tarife',
      }
      return dict[key] || (opts?.defaultValue as string) || key
    },
  }),
}))

describe('RouteInfoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(<RouteInfoModal hatKodu="500T" isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with accessibility attributes and fetches route info', async () => {
    vi.mocked(api.routes.info).mockResolvedValueOnce({
      hat_kodu: '500T',
      trip_duration_min: 120,
      hat_tipi: 'Normal',
      tarife: 'Tam',
    })

    const onClose = vi.fn()
    render(<RouteInfoModal hatKodu="500T" isOpen={true} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'route-info-title')

    const closeBtn = screen.getByLabelText('Kapat')
    expect(closeBtn).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('120 dk')).toBeInTheDocument()
    })
    expect(api.routes.info).toHaveBeenCalledWith('500T', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('closes when Escape key is pressed', () => {
    vi.mocked(api.routes.info).mockReturnValue(new Promise(() => {}))
    const onClose = vi.fn()
    render(<RouteInfoModal hatKodu="500T" isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
