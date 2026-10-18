import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StopInfoModal from '../StopInfoModal'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    stops: {
      info: vi.fn(),
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const dict: Record<string, string> = {
        'stops.info': 'Durak Bilgisi',
        'common.close': 'Kapat',
        'stops.district': 'İlçe',
        'stops.physicalStatus': 'Fiziki Durum',
        'stops.smartStatus': 'Akıllı Durak',
        'common.yes': 'Var',
        'common.no': 'Yok',
      }
      return dict[key] || (opts?.defaultValue as string) || key
    },
  }),
}))

describe('StopInfoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(<StopInfoModal dcode="100123" isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with accessibility attributes and fetches stop info', async () => {
    vi.mocked(api.stops.info).mockResolvedValueOnce({
      dcode: '100123',
      ilce: 'Kadıköy',
      fiziki_durum: 'Kapalı Durak',
      akilli_durak: true,
    })

    const onClose = vi.fn()
    render(<StopInfoModal dcode="100123" isOpen={true} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'stop-info-title')

    const closeBtn = screen.getByLabelText('Kapat')
    expect(closeBtn).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Kadıköy')).toBeInTheDocument()
      expect(screen.getByText('Kapalı Durak')).toBeInTheDocument()
      expect(screen.getByText('Var')).toBeInTheDocument()
    })
    expect(api.stops.info).toHaveBeenCalledWith('100123', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('closes when Escape key is pressed', () => {
    vi.mocked(api.stops.info).mockReturnValue(new Promise(() => {}))
    const onClose = vi.fn()
    render(<StopInfoModal dcode="100123" isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
