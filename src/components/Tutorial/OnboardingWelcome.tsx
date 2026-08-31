import { useEffect, useRef } from 'react'
import { useTutorialStore } from '@/store/tutorialStore'

/**
 * OnboardingWelcome
 *
 * A full-screen welcome modal shown once to brand-new users (i.e. when the
 * tutorial has never been dismissed or completed). It sits above the regular
 * TutorialFlow step-card and gives new visitors a clear entry point to either
 * start the guided tour or skip straight into the app.
 */
export function OnboardingWelcome() {
  const { dismissed, completed, startedAt, dismiss, setStep } = useTutorialStore()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Only show when the user has never interacted with the tutorial
  const isFirstVisit = !dismissed && !completed && startedAt === null

  // Trap focus inside the modal while it is open
  useEffect(() => {
    if (!isFirstVisit) return
    const el = dialogRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    first?.focus()
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [isFirstVisit])

  if (!isFirstVisit) return null

  function handleStartTutorial() {
    // setStep(0) marks startedAt, triggering TutorialFlow to show step 0
    setStep(0)
  }

  function handleSkip() {
    dismiss()
  }

  return (
    <div
      className="onboarding-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
      ref={dialogRef}
    >
      <div className="onboarding-modal">
        {/* Decorative nebula glow */}
        <div className="onboarding-glow" aria-hidden="true" />

        <div className="onboarding-icon" aria-hidden="true">
          🌌
        </div>

        <h1 id="onboarding-title" className="onboarding-title">
          Welcome to Stellar Nebula
        </h1>

        <p id="onboarding-desc" className="onboarding-desc">
          Drift through procedurally generated nebulae, harvest on-chain resources, and upgrade your
          NFT ship on the Stellar network. New here? Our quick tour will get you up to speed in
          under two minutes.
        </p>

        {/* Wallet setup help card */}
        <div className="onboarding-wallet-card" aria-label="Wallet setup guidance">
          <p className="onboarding-wallet-title">
            <span aria-hidden="true">👛</span> Need a wallet?
          </p>
          <p className="onboarding-wallet-copy">
            Stellar Nebula works with{' '}
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="onboarding-link"
            >
              Freighter
            </a>{' '}
            (browser extension) and{' '}
            <a
              href="https://albedo.link"
              target="_blank"
              rel="noopener noreferrer"
              className="onboarding-link"
            >
              Albedo
            </a>{' '}
            (web wallet). Install either one, fund it on Testnet via{' '}
            <a
              href="https://laboratory.stellar.org/account-creator"
              target="_blank"
              rel="noopener noreferrer"
              className="onboarding-link"
            >
              Stellar Laboratory
            </a>
            , then come back here to connect.
          </p>
        </div>

        {/* First scan hint */}
        <div className="onboarding-hint-row" aria-label="First scan tip">
          <span className="onboarding-hint-icon" aria-hidden="true">
            🔭
          </span>
          <p className="onboarding-hint-text">
            Your first mission: open the <strong>Nebula</strong> view and click a glowing anomaly to
            run a scan and collect your first resource.
          </p>
        </div>

        <div className="onboarding-actions">
          <button
            type="button"
            onClick={handleStartTutorial}
            className="onboarding-btn onboarding-btn--primary"
            aria-label="Start the guided onboarding tutorial"
          >
            Start guided tour
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="onboarding-btn onboarding-btn--ghost"
            aria-label="Skip the tutorial and go straight to the app"
          >
            Skip, I know what I'm doing
          </button>
        </div>

        <p className="onboarding-replay-note">You can replay this tour any time from Settings.</p>
      </div>
    </div>
  )
}
