import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/utils'
import SettingsPanel from '../SettingsPanel'
import { useSettingsStore } from '../../../store/settingsStore'

function renderPanel(onClose?: () => void) {
  return render(<SettingsPanel onClose={onClose} />)
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      graphicsQuality: 'high',
      soundEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
      network: 'futurenet',
    })
    localStorage.clear()
  })

  it('renders all settings sections', () => {
    renderPanel()
    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByText('Graphics')).toBeInTheDocument()
    expect(screen.getByText('Sound')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
  })

  it('changes graphics quality', () => {
    renderPanel()
    const select = screen.getByLabelText(/quality/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'low' } })
    expect(useSettingsStore.getState().graphicsQuality).toBe('low')
  })

  it('toggles sound', () => {
    renderPanel()
    const toggle = screen.getByRole('switch', { name: /sound effects/i })
    fireEvent.click(toggle)
    expect(useSettingsStore.getState().soundEnabled).toBe(false)
  })

  it('toggles notifications', () => {
    renderPanel()
    const toggle = screen.getByRole('switch', { name: /notifications/i })
    fireEvent.click(toggle)
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false)
  })

  it('toggles privacy analytics opt-out', () => {
    renderPanel()
    const toggle = screen.getByRole('switch', { name: /privacy analytics/i })
    fireEvent.click(toggle)
    expect(useSettingsStore.getState().analyticsEnabled).toBe(false)
    expect(localStorage.getItem('stellar-nebula:analytics-opt-out')).toBe('true')
  })

  it('changes network', () => {
    renderPanel()
    const select = screen.getByLabelText(/stellar network/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'testnet' } })
    expect(useSettingsStore.getState().network).toBe('testnet')
  })

  it('calls onClose when close button clicked', () => {
    let closed = false
    renderPanel(() => {
      closed = true
    })
    fireEvent.click(screen.getByRole('button', { name: /close settings/i }))
    expect(closed).toBe(true)
  })

  it('persists settings to localStorage', () => {
    renderPanel()
    const select = screen.getByLabelText(/quality/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'medium' } })
    const stored = localStorage.getItem('stellar-nebula:settings-store')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).state.graphicsQuality).toBe('medium')
  })
})
