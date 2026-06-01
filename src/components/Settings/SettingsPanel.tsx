import { useSettingsStore } from '@/store/settingsStore'
import type { GraphicsQuality, StellarNetwork } from '@/store/settingsStore'
import { analytics } from '@/services/analytics'

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

function Toggle({ id, checked, onChange, label }: ToggleProps) {
  return (
    <label htmlFor={id} className="settings-toggle-label">
      <span>{label}</span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`settings-toggle ${checked ? 'settings-toggle--on' : ''}`}
        aria-label={label}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </label>
  )
}

interface SelectProps<T extends string> {
  id: string
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

function Select<T extends string>({ id, label, value, options, onChange }: SelectProps<T>) {
  return (
    <div className="settings-field">
      <label htmlFor={id} className="settings-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="settings-select"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const QUALITY_OPTIONS: { value: GraphicsQuality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const NETWORK_OPTIONS: { value: StellarNetwork; label: string }[] = [
  { value: 'futurenet', label: 'Futurenet' },
  { value: 'testnet', label: 'Testnet' },
  { value: 'mainnet', label: 'Mainnet' },
]

interface SettingsPanelProps {
  onClose?: () => void
}

function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    graphicsQuality,
    soundEnabled,
    notificationsEnabled,
    analyticsEnabled,
    network,
    setGraphicsQuality,
    setSoundEnabled,
    setNotificationsEnabled,
    setAnalyticsEnabled,
    setNetwork,
  } = useSettingsStore()

  const handleAnalyticsEnabled = (enabled: boolean) => {
    setAnalyticsEnabled(enabled)
    analytics.setOptOut(!enabled)
  }

  return (
    <div className="settings-panel" role="dialog" aria-label="Settings" aria-modal="true">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        {onClose && (
          <button onClick={onClose} className="settings-close" aria-label="Close settings">
            ✕
          </button>
        )}
      </div>

      <div className="settings-body">
        <section className="settings-section" aria-labelledby="graphics-heading">
          <h3 id="graphics-heading" className="settings-section-title">
            Graphics
          </h3>
          <Select
            id="graphics-quality"
            label="Quality"
            value={graphicsQuality}
            options={QUALITY_OPTIONS}
            onChange={setGraphicsQuality}
          />
        </section>

        <section className="settings-section" aria-labelledby="sound-heading">
          <h3 id="sound-heading" className="settings-section-title">
            Sound
          </h3>
          <Toggle
            id="sound-toggle"
            checked={soundEnabled}
            onChange={setSoundEnabled}
            label="Sound effects"
          />
        </section>

        <section className="settings-section" aria-labelledby="notifications-heading">
          <h3 id="notifications-heading" className="settings-section-title">
            Notifications
          </h3>
          <Toggle
            id="notifications-toggle"
            checked={notificationsEnabled}
            onChange={setNotificationsEnabled}
            label="In-game notifications"
          />
        </section>

        <section className="settings-section" aria-labelledby="privacy-heading">
          <h3 id="privacy-heading" className="settings-section-title">
            Privacy
          </h3>
          <Toggle
            id="analytics-toggle"
            checked={analyticsEnabled}
            onChange={handleAnalyticsEnabled}
            label="Privacy analytics"
          />
        </section>

        <section className="settings-section" aria-labelledby="network-heading">
          <h3 id="network-heading" className="settings-section-title">
            Network
          </h3>
          <Select
            id="network-select"
            label="Stellar network"
            value={network}
            options={NETWORK_OPTIONS}
            onChange={setNetwork}
          />
        </section>
      </div>
    </div>
  )
}

export default SettingsPanel
