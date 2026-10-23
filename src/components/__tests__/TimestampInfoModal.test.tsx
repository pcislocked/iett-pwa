import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TimestampInfoModal from '../TimestampInfoModal'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const dict: Record<string, string> = {
        'stops.timestamps': 'Zaman Damgaları',
        'stops.cardNowTitle': 'Şu An (Cihaz Saati)',
        'stops.cardServerNowTitle': 'Sunucu Saati',
        'stops.nowTimeDesc': 'Cihazınızın mevcut yerel saatidir.',
        'stops.serverNtpDesc': "Sunucularımızda zaman senkronizasyonu için TÜBİTAK Ulusal Metroloji Enstitüsü'nün zaman sunucusu kullanılmaktadır.",
        'stops.cardClientTitle': 'Uygulama',
        'stops.cardServerTitle': 'Sunucu Önbelleği',
        'stops.cardGpsTitle': 'Canlı GPS',
        'stops.timestampDescUpdate': 'Uygulama güncelleme zamanı.',
        'stops.timestampDescIett': 'Sunucu önbellek zamanı.',
        'stops.gpsTimeDesc': 'GPS donanımlarından aktarılan saat.',
        'stops.gpsTimeNoBusesNote': 'Araç yok.',
        'stops.timestampLagWarning': 'Gecikme uyarısı.',
        'stops.forceRefresh': 'Zorla Yenile',
        'common.close': 'Kapat',
        'stops.serverNodeSub': 'Ara sunucu',
        'stops.clientNodeSub': 'Bu uygulama',
        'stops.fieldNodeSub': 'Resmi veri',
        'time.ago': `${opts?.count ?? 0} sn önce`,
        'time.minuteAgo': `${opts?.count ?? 0} dk önce`,
        'time.hourAgo': `${opts?.count ?? 0} sa önce`,
      }
      return dict[key] || key
    },
  }),
}))

vi.mock('@/api/client', () => ({
  api: {
    system: {
      time: vi.fn().mockResolvedValue({
        status: 'ok',
        iso: '2026-10-18T12:00:10.000Z',
        time: '15:00:10',
        timestamp: 1729252810,
        timezone: 'Europe/Istanbul',
        source: 'TÜBİTAK UME NTP',
      }),
    },
  },
}))

describe('TimestampInfoModal', () => {
  const baseTime = new Date('2026-10-18T12:00:10.000Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(baseTime)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders live clock and updates every second alongside relative times', async () => {
    const onClose = vi.fn()
    const onForceRefresh = vi.fn()

    // Client timestamp is 4 seconds ago
    const clientTs = new Date(baseTime - 4000).toISOString()
    const serverTs = new Date(baseTime - 8000).toISOString()
    const gpsTs = '12:00:02'

    await act(async () => {
      render(
        <TimestampInfoModal
          onClose={onClose}
          onForceRefresh={onForceRefresh}
          lastUpdated={clientTs}
          iettUpdatedAt={serverTs}
          maxGpsTime={gpsTs}
          timestampMode="relative"
        />
      )
    })

    expect(screen.getByText('Zaman Damgaları')).toBeInTheDocument()
    expect(screen.getByText('Şu An (Cihaz Saati)')).toBeInTheDocument()
    expect(screen.getByText('Sunucu Saati')).toBeInTheDocument()
    expect(screen.getByText(/TÜBİTAK Ulusal Metroloji Enstitüsü/)).toBeInTheDocument()

    // Assert initial time contains seconds
    const initialNowText = screen.getByText('Şu An (Cihaz Saati)').closest('div')?.querySelector('.font-mono')?.textContent
    expect(initialNowText).toBeDefined()

    // Advance by 1 second
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    const tickedNowText = screen.getByText('Şu An (Cihaz Saati)').closest('div')?.querySelector('.font-mono')?.textContent
    expect(tickedNowText).not.toBe(initialNowText)
  })

  it('handles force refresh and close buttons', async () => {
    const onClose = vi.fn()
    const onForceRefresh = vi.fn()

    await act(async () => {
      render(
        <TimestampInfoModal
          onClose={onClose}
          onForceRefresh={onForceRefresh}
          lastUpdated={null}
          iettUpdatedAt={null}
          maxGpsTime={null}
        />
      )
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Zorla Yenile'))
    })
    expect(onForceRefresh).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(screen.getByText('Kapat'))
    })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
