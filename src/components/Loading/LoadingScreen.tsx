import { useEffect, useMemo, useState } from 'react'

interface LoadingScreenProps {
  message?: string
  stageLabel?: string
  progress?: number
}

const DEFAULT_MESSAGES = [
  'Aligning stellar navigation arrays...',
  'Syncing beacon telemetry...',
  'Charging nebula scanners...',
]

function clampProgress(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export default function LoadingScreen({
  message,
  stageLabel = 'Initializing systems',
  progress,
}: LoadingScreenProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const boundedProgress = clampProgress(progress)

  useEffect(() => {
    if (message) return undefined

    const interval = window.setInterval(() => {
      setFallbackIndex((current) => (current + 1) % DEFAULT_MESSAGES.length)
    }, 1800)

    return () => {
      window.clearInterval(interval)
    }
  }, [message])

  const displayMessage = useMemo(
    () => message ?? DEFAULT_MESSAGES[fallbackIndex],
    [fallbackIndex, message],
  )

  return (
    <section className="loading-screen" aria-live="polite" aria-busy="true">
      <div className="loading-stars" aria-hidden="true">
        <span className="loading-star loading-star-one" />
        <span className="loading-star loading-star-two" />
        <span className="loading-star loading-star-three" />
      </div>

      <div className="loading-orbiter" aria-hidden="true">
        <span className="loading-orbit loading-orbit-one" />
        <span className="loading-orbit loading-orbit-two" />
        <span className="loading-core" />
      </div>

      <div className="loading-content">
        <p className="loading-stage">{stageLabel}</p>
        <p className="loading-message" key={displayMessage}>
          {displayMessage}
        </p>

        <div
          className="loading-progress"
          role="progressbar"
          aria-label="Application loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={boundedProgress}
        >
          <span className="loading-progress-fill" style={{ width: `${boundedProgress}%` }} />
        </div>

        <p className="loading-percent">{boundedProgress}% complete</p>
      </div>
    </section>
  )
}
