import { useRef, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import type { GraphicsQuality, StellarNetwork } from '@/store/settingsStore'
import { useGraphicsStore } from '@/store/graphicsStore'
import { analytics } from '@/services/analytics'
import {
  downloadSave,
  importSaveFromFile,
  clearAllGameData,
  type SliceName,
} from '@/services/saveLoad'

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

/** Settings-relevant slices only - excludes ship/resource/game progress. */
const SETTINGS_SLICES: SliceName[] = ['settings', 'graphics']

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

  const {
    bloomEnabled,
    performanceMode,
    autoRotateEnabled,
    setBloomEnabled,
    setPerformanceMode,
    setAutoRotateEnabled,
  } = useGraphicsStore()

  const [dataMessage, setDataMessage] = useState<string | null>(null)
  const saveFileInputRef = useRef<HTMLInputElement>(null)
  const settingsFileInputRef = useRef<HTMLInputElement>(null)

  const handleAnalyticsEnabled = (enabled: boolean) => {
    setAnalyticsEnabled(enabled)
    analytics.setOptOut(!enabled)
  }

  const handleExportSave = () => {
    downloadSave('stellar-nebula-save.json')
    setDataMessage('Save exported.')
  }

  const handleExportSettings = () => {
    downloadSave('stellar-nebula-settings.json', SETTINGS_SLICES)
    setDataMessage('Settings exported.')
  }

  const handleImportFile = async (file: File, sliceNames?: SliceName[]) => {
    const result = await importSaveFromFile(file)
    const relevant = sliceNames
      ? {
          applied: result.applied.filter((name) => sliceNames.includes(name as SliceName)),
          skipped: result.skipped,
        }
      : result

    if (relevant.skipped.length > 0) {
      setDataMessage(
        `Imported ${relevant.applied.length} section(s), skipped: ${relevant.skipped
          .map((s) => s.name)
          .join(', ')}`
      )
    } else {
      setDataMessage(`Imported ${relevant.applied.length} section(s) successfully.`)
    }
  }

  const handleNewGame = () => {
    if (!window.confirm('Reset all game progress? This cannot be undone.')) return
    clearAllGameData()
    setDataMessage('Game data cleared.')
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
          <Toggle
            id="bloom-toggle"
            checked={bloomEnabled}
            onChange={setBloomEnabled}
            label="Bloom effect"
          />
          <Toggle
            id="performance-mode-toggle"
            checked={performanceMode}
            onChange={setPerformanceMode}
            label="Performance mode (mobile-friendly)"
          />
          <Toggle
            id="auto-rotate-toggle"
            checked={autoRotateEnabled}
            onChange={setAutoRotateEnabled}
            label="Auto-rotate camera"
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

        <section className="settings-section" aria-labelledby="data-heading">
          <h3 id="data-heading" className="settings-section-title">
            Save data
          </h3>
          <div className="settings-data-actions">
            <button
              type="button"
              className="settings-button"
              onClick={handleExportSave}
              aria-label="Export save file"
            >
              Export save
            </button>
            <button
              type="button"
              className="settings-button"
              aria-label="Import save file"
              onClick={() => saveFileInputRef.current?.click()}
            >
              Import save
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={handleExportSettings}
              aria-label="Export settings file"
            >
              Export settings
            </button>
            <button
              type="button"
              className="settings-button"
              aria-label="Import settings file"
              onClick={() => settingsFileInputRef.current?.click()}
            >
              Import settings
            </button>
            <button
              type="button"
              className="settings-button settings-button--danger"
              aria-label="Start new game and clear all data"
              onClick={handleNewGame}
            >
              New game (clear data)
            </button>
          </div>
          {dataMessage && <p className="settings-data-message">{dataMessage}</p>}
          <input
            ref={saveFileInputRef}
            type="file"
            accept="application/json"
            aria-label="Import save file input"
            className="settings-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
          <input
            ref={settingsFileInputRef}
            type="file"
            accept="application/json"
            aria-label="Import settings file input"
            className="settings-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file, SETTINGS_SLICES)
              e.target.value = ''
            }}
          />
        </section>
      </div>
    </div>
  )
}

export default SettingsPanel
