import { useTutorialStore } from '@/store/tutorialStore'
import { TutorialHighlight } from './TutorialHighlight'

interface TutorialStep {
  title: string
  description: string
  highlight?: string
  icon: string
  objective?: TutorialObjective
  actionLabel?: string
  route?: string
}

const STEPS: TutorialStep[] = [
  {
    icon: '🚀',
    title: 'Welcome to Stellar Nebula',
    description:
      'Drift through procedurally generated nebulae, harvest resources, and upgrade your NFT ship on Stellar.',
    highlight: '.brand',
  },
  {
    icon: '👛',
    title: 'Connect Your Wallet',
    description:
      'Connect a Freighter or Albedo wallet to sign transactions. Your wallet is your identity in the nebula.',
    highlight: '.wallet-connect-btn',
    objective: 'connect-wallet',
  },
  {
    icon: '🌌',
    title: 'Complete Your First Scan',
    description:
      'Open the Nebula view and select a scan point. Completed scans add the harvested resource to inventory.',
    highlight: '[href="/nebula"]',
    objective: 'first-scan',
    actionLabel: 'Open Nebula',
    route: '/nebula',
  },
  {
    icon: '🛸',
    title: 'Apply Your First Upgrade',
    description:
      'Open the Ship dashboard, choose an affordable upgrade, review the cost, and apply it.',
    highlight: '[href="/dashboard"]',
    objective: 'first-upgrade',
    actionLabel: 'Open Ship Dashboard',
    route: '/dashboard',
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
  const {
    currentStep,
    completed,
    dismissed,
    completedObjectives,
    setStep,
    completeObjective,
    complete,
    dismiss,
    replay,
  } = useTutorialStore()
  const walletContext = useContext(WalletContext)

  useEffect(() => {
    if (walletContext?.walletState.isConnected) {
      completeObjective('connect-wallet')
    }
  }, [completeObjective, walletContext?.walletState.isConnected])

  if (dismissed) return null

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0
  const objectiveComplete = !step.objective || completedObjectives.includes(step.objective)

  function handleNext() {
    if (!objectiveComplete) return

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
  if (completed) {
    return (
      <div className="tutorial-overlay" role="dialog" aria-label="Tutorial" aria-modal="false">
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
    <>
      <TutorialHighlight selector={step.highlight ?? null} visible={!!step.highlight} />

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
    </>
  )
}

export default TutorialFlow
