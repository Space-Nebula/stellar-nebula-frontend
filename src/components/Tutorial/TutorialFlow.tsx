import { useTutorialStore } from '@/store/tutorialStore'

interface TutorialStep {
  title: string
  description: string
  highlight?: string
  icon: string
}

const STEPS: TutorialStep[] = [
  {
    icon: '🚀',
    title: 'Welcome to Stellar Nebula',
    description:
      'Drift through procedurally generated nebulae, harvest stardust, and upgrade your NFT ship — all on the Stellar blockchain.',
    highlight: '.brand',
  },
  {
    icon: '👛',
    title: 'Connect Your Wallet',
    description:
      'Connect a Freighter or Albedo wallet to sign transactions. Your wallet is your identity in the nebula.',
    highlight: '.wallet-connect-btn',
  },
  {
    icon: '🌌',
    title: 'Explore the Nebula',
    description:
      'Navigate to the Nebula view to scan cosmic anomalies. Click scan points to harvest stardust resources.',
    highlight: '[href="/nebula"]',
  },
  {
    icon: '🛸',
    title: 'Upgrade Your Ship',
    description:
      'Visit the Ship Dashboard to view your NFT modules and spend resources on upgrades for better yields.',
    highlight: '[href="/dashboard"]',
  },
  {
    icon: '✅',
    title: "You're Ready!",
    description:
      'Start your journey through the cosmos. You can replay this tutorial anytime from the settings.',
  },
]

interface TutorialFlowProps {
  onClose?: () => void
}

function TutorialFlow({ onClose }: TutorialFlowProps) {
  const { currentStep, completed, dismissed, setStep, complete, dismiss, replay } =
    useTutorialStore()

  if (dismissed && !completed) return null

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0

  function handleNext() {
    if (isLast) {
      complete()
      onClose?.()
    } else {
      setStep(currentStep + 1)
    }
  }

  function handleBack() {
    if (!isFirst) setStep(currentStep - 1)
  }

  function handleSkip() {
    dismiss()
    onClose?.()
  }

  function handleReplay() {
    replay()
  }

  // Show replay button if completed
  if (completed && !dismissed) {
    return (
      <div className="tutorial-overlay" role="dialog" aria-label="Tutorial" aria-modal="true">
        <div className="tutorial-card">
          <p className="tutorial-completed-msg">Tutorial completed! Want to replay it?</p>
          <div className="tutorial-actions">
            <button onClick={handleReplay} className="tutorial-btn tutorial-btn--primary">
              Replay Tutorial
            </button>
            <button onClick={onClose} className="tutorial-btn tutorial-btn--ghost">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-label="Tutorial" aria-modal="true">
      <div className="tutorial-card">
        <div
          className="tutorial-progress"
          aria-label={`Step ${currentStep + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tutorial-dot ${i === currentStep ? 'tutorial-dot--active' : i < currentStep ? 'tutorial-dot--done' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="tutorial-icon" aria-hidden="true">
          {step.icon}
        </div>

        <h2 className="tutorial-title">{step.title}</h2>
        <p className="tutorial-description">{step.description}</p>

        {step.highlight && (
          <p className="tutorial-hint">
            <span aria-hidden="true">👆</span> Look for the highlighted element on the page.
          </p>
        )}

        <div className="tutorial-actions">
          {!isFirst && (
            <button onClick={handleBack} className="tutorial-btn tutorial-btn--ghost">
              Back
            </button>
          )}
          <button onClick={handleNext} className="tutorial-btn tutorial-btn--primary">
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>

        <button onClick={handleSkip} className="tutorial-skip" aria-label="Skip tutorial">
          Skip tutorial
        </button>
      </div>
    </div>
  )
}

export default TutorialFlow
