import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/utils'
import { OnboardingWelcome } from '../OnboardingWelcome'
import { useTutorialStore } from '../../../store/tutorialStore'

describe('OnboardingWelcome', () => {
  beforeEach(() => {
    useTutorialStore.setState({
      completed: false,
      currentStep: 0,
      dismissed: false,
      startedAt: null,
      completedObjectives: [],
    })
  })

  it('renders the welcome modal for first-time visitors', () => {
    render(<OnboardingWelcome />)
    expect(screen.getByRole('dialog', { name: /welcome to stellar nebula/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start the guided onboarding tutorial/i })
    ).toBeInTheDocument()
  })

  it('does not render when the tutorial has been dismissed', () => {
    useTutorialStore.setState({ dismissed: true, completed: false, startedAt: null })
    const { container } = render(<OnboardingWelcome />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render when the tutorial has been completed', () => {
    useTutorialStore.setState({ completed: true, dismissed: false, startedAt: null })
    const { container } = render(<OnboardingWelcome />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render when tutorial has already been started (startedAt set)', () => {
    useTutorialStore.setState({
      startedAt: '2025-01-01T00:00:00.000Z',
      dismissed: false,
      completed: false,
    })
    const { container } = render(<OnboardingWelcome />)
    expect(container.firstChild).toBeNull()
  })

  it('starts the tutorial when "Start guided tour" is clicked', () => {
    render(<OnboardingWelcome />)
    fireEvent.click(screen.getByRole('button', { name: /start the guided onboarding tutorial/i }))
    // setStep(0) sets startedAt
    expect(useTutorialStore.getState().startedAt).not.toBeNull()
  })

  it('dismisses when "Skip" is clicked', () => {
    render(<OnboardingWelcome />)
    fireEvent.click(
      screen.getByRole('button', { name: /skip the tutorial and go straight to the app/i })
    )
    expect(useTutorialStore.getState().dismissed).toBe(true)
  })

  it('shows wallet setup guidance with Freighter and Albedo links', () => {
    render(<OnboardingWelcome />)
    expect(screen.getByRole('link', { name: /freighter/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /albedo/i })).toBeInTheDocument()
  })

  it('shows the first scan hint section', () => {
    render(<OnboardingWelcome />)
    expect(screen.getByLabelText(/first scan tip/i)).toBeInTheDocument()
    // The hint text references the Nebula view
    expect(screen.getByText(/your first mission/i)).toBeInTheDocument()
  })

  it('shows the replay note', () => {
    render(<OnboardingWelcome />)
    expect(screen.getByText(/replay this tour/i)).toBeInTheDocument()
  })
})
