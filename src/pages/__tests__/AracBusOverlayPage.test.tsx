import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import AracBusOverlayPage from '@/pages/AracBusOverlayPage'

const mocks = vi.hoisted(() => ({
  captcha: vi.fn(),
  autoSolve: vi.fn(),
  createSession: vi.fn(),
  bus: vi.fn(),
  missions: vi.fn(),
  loadAracSession: vi.fn(),
  saveAracSession: vi.fn((session: { sessionId: string; sessionKey: string }) => ({
    ...session,
    savedAt: '2026-04-19T00:00:00Z',
  })),
  clearAracSession: vi.fn(),
}))

vi.mock('@/api/aracSession', () => ({
  loadAracSession: mocks.loadAracSession,
  saveAracSession: mocks.saveAracSession,
  clearAracSession: mocks.clearAracSession,
}))

vi.mock('@/api/client', () => {
  class ApiHttpError extends Error {
    status: number
    responseText: string
    path: string

    constructor(path: string, status: number, responseText: string) {
      super(`API ${path} -> HTTP ${status}: ${responseText}`)
      this.name = 'ApiHttpError'
      this.path = path
      this.status = status
      this.responseText = responseText
    }
  }

  return {
    ApiHttpError,
    api: {
      arac: {
        captcha: mocks.captcha,
        autoSolve: mocks.autoSolve,
        createSession: mocks.createSession,
        bus: mocks.bus,
        missions: mocks.missions,
      },
    },
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AracBusOverlayPage', () => {
  function renderPage(entry = '/arac/bus/C-1753', path = '/arac/bus/:kapino') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={<AracBusOverlayPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('shows manual captcha input first and does not auto-solve automatically', async () => {
    mocks.loadAracSession.mockReturnValue(null)
    mocks.captcha.mockResolvedValue({
      captchaId: 'cid-1',
      captchaImageBase64: 'AAAA',
    })

    renderPage()

    await screen.findByRole('heading', { name: /captcha manuel dogrulama/i })
    expect(screen.getByRole('textbox', { name: /captcha cevabi/i })).toBeInTheDocument()
    expect(mocks.captcha).toHaveBeenCalledTimes(1)
    expect(mocks.autoSolve).not.toHaveBeenCalled()
  })

  it('renders profile and mission sections when an existing session is valid', async () => {
    mocks.loadAracSession.mockReturnValue({
      sessionId: 'sid-1',
      sessionKey: 'skey-1',
      savedAt: '2026-04-19T00:00:00Z',
    })
    mocks.bus.mockResolvedValue({
      plate: '34 HO 1753',
      route_code: '14R',
      direction: 'G',
      vehicle_brand: 'MERCEDES',
      has_usb: true,
      has_wifi: false,
      has_bicycle_rack: false,
      is_air_conditioned: true,
      accessible: true,
      last_seen: '2026-04-19T00:00:00Z',
    })
    mocks.missions.mockResolvedValue({
      kapino: 'C-1753',
      summary: {
        mission_count: 1,
        active_count: 1,
        distinct_line_codes: ['14R'],
        distinct_route_codes: ['14R_G_D0'],
      },
      missions: [
        {
          task_id: 101,
          line_code: '14R',
          task_status_code: 'ACTIVE',
          is_active: true,
        },
      ],
    })

    renderPage()

    await screen.findByRole('heading', { name: /arac profili \/ vehicle profile/i })
    expect(screen.getByRole('heading', { name: /missions \/ gorevler/i })).toBeInTheDocument()
    expect(screen.getByText(/session hazir/i)).toBeInTheDocument()
    expect(mocks.bus).toHaveBeenCalledTimes(1)
    expect(mocks.missions).toHaveBeenCalledTimes(1)
    expect(mocks.captcha).not.toHaveBeenCalled()
  })

  it('shows warning and avoids session creation when manual submit is empty', async () => {
    mocks.loadAracSession.mockReturnValue(null)
    mocks.captcha.mockResolvedValue({
      captchaId: 'cid-1',
      captchaImageBase64: 'AAAA',
    })

    renderPage()

    await screen.findByRole('heading', { name: /captcha manuel dogrulama/i })
    fireEvent.click(screen.getByRole('button', { name: /oturumu ac/i }))

    expect(screen.getByText(/lutfen captcha yanitini girin\./i)).toBeInTheDocument()
    expect(mocks.createSession).not.toHaveBeenCalled()
  })

  it('submits manual captcha and transitions to ready state', async () => {
    mocks.loadAracSession.mockReturnValue(null)
    mocks.captcha.mockResolvedValue({
      captchaId: 'cid-1',
      captchaImageBase64: 'AAAA',
    })
    mocks.createSession.mockResolvedValue({
      sessionId: 'sid-1',
      sessionKey: 'skey-1',
    })
    mocks.bus.mockResolvedValue({
      plate: '34 HO 1753',
      route_code: '14R',
      direction: 'G',
      last_seen: '2026-04-19T00:00:00Z',
      accessible: true,
      has_usb: true,
      has_wifi: false,
      has_bicycle_rack: false,
      is_air_conditioned: true,
    })
    mocks.missions.mockResolvedValue({
      kapino: 'C-1753',
      summary: {
        mission_count: 1,
        active_count: 1,
        distinct_line_codes: ['14R'],
        distinct_route_codes: ['14R_G_D0'],
      },
      missions: [
        {
          task_id: 101,
          line_code: '14R',
          task_status_code: 'ACTIVE',
          is_active: true,
        },
      ],
    })

    renderPage()

    await screen.findByRole('heading', { name: /captcha manuel dogrulama/i })
    fireEvent.change(screen.getByRole('textbox', { name: /captcha cevabi/i }), {
      target: { value: 'abcd' },
    })
    fireEvent.click(screen.getByRole('button', { name: /oturumu ac/i }))

    await screen.findByRole('heading', { name: /arac profili \/ vehicle profile/i })
    expect(mocks.createSession).toHaveBeenCalledWith({
      captchaId: 'cid-1',
      captchaAnswer: 'ABCD',
    })
    expect(mocks.saveAracSession).toHaveBeenCalledOnce()
    expect(mocks.bus).toHaveBeenCalledOnce()
    expect(mocks.missions).toHaveBeenCalledOnce()
  })

  it('shows verification warning and refreshes captcha when manual submit fails', async () => {
    mocks.loadAracSession.mockReturnValue(null)
    mocks.captcha.mockResolvedValue({
      captchaId: 'cid-1',
      captchaImageBase64: 'AAAA',
    })
    mocks.createSession.mockRejectedValue(new Error('Wrong CAPTCHA'))

    renderPage()

    await screen.findByRole('heading', { name: /captcha manuel dogrulama/i })
    fireEvent.change(screen.getByRole('textbox', { name: /captcha cevabi/i }), {
      target: { value: 'abcd' },
    })
    fireEvent.click(screen.getByRole('button', { name: /oturumu ac/i }))

    await screen.findByText(/captcha dogrulanamadi: wrong captcha/i)
    expect(mocks.createSession).toHaveBeenCalledOnce()
    expect(mocks.captcha).toHaveBeenCalledTimes(2)
  })

  it('attempts auto-solve only after user clicks the auto-solve button', async () => {
    mocks.loadAracSession.mockReturnValue(null)
    mocks.captcha.mockResolvedValue({
      captchaId: 'cid-1',
      captchaImageBase64: 'AAAA',
    })
    mocks.autoSolve.mockResolvedValue({
      captchaId: 'cid-1',
      captchaImageBase64: 'AAAA',
      solved: false,
      strategy: 'ocr-candidates',
      candidatesTried: ['ABCD'],
      selectedCandidate: null,
      sessionId: null,
      sessionKey: null,
      error: 'Wrong CAPTCHA',
    })

    renderPage()

    await screen.findByRole('heading', { name: /captcha manuel dogrulama/i })
    expect(mocks.autoSolve).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /oto coz dene/i }))

    await screen.findByText(/otomatik cozum 3 denemede basarisiz oldu/i)
    expect(mocks.autoSolve).toHaveBeenCalledTimes(3)
  })

  it('shows fatal error when kapino param is missing', async () => {
    renderPage('/arac/bus', '/arac/bus')
    await screen.findByText(/kapi kodu bulunamadi\./i)
  })
})
