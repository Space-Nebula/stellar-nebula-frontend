import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/utils'
import TutorialFlow from '../TutorialFlow'
import { useTutorialStore } from '../../../store/tutorialStore'

function renderTutorial(onClose?: () => void) {
  return render(<TutorialFlow onClose={onClose} />)
}

describe('TutorialFlow', () => {
  beforeEach(() => {
    useTutorialStore.setState({ completed: false, currentStep: 0, dismissed: false })
  })

  it('renders the first step', () => {
    renderTutorial()
    expect(screen.getByRole('dialog', { name: /tutorial/i })).toBeInTheDocument()
    expect(screen.getByText(/Welcome to Stellar Nebula/i)).toBeInTheDocument()
  })

  it('advances to next step', () => {
    renderTutorial()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/Connect Your Wallet/i)).toBeInTheDocument()
  })

  it('goes back to previous step', () => {
    useTutorialStore.setState({ currentStep: 1, completed: false, dismissed: false })
    renderTutorial()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(useTutorialStore.getState().currentStep).toBe(0)
  })

  it('skips the tutorial', () => {
    let closed = false
    renderTutorial(() => {
      closed = true
    })
    fireEvent.click(screen.getByRole('button', { name: /skip tutorial/i }))
    expect(useTutorialStore.getState().dismissed).toBe(true)
    expect(closed).toBe(true)
  })

  it('completes tutorial on last step', () => {
    useTutorialStore.setState({ currentStep: 4, completed: false, dismissed: false })
    let closed = false
    renderTutorial(() => {
      closed = true
    })
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    expect(useTutorialStore.getState().completed).toBe(true)
    expect(closed).toBe(true)
  })

  it('can replay the tutorial', () => {
    useTutorialStore.setState({ completed: true, dismissed: false, currentStep: 4 })
    renderTutorial()
    fireEvent.click(screen.getByRole('button', { name: /replay tutorial/i }))
    expect(useTutorialStore.getState().completed).toBe(false)
    expect(useTutorialStore.getState().currentStep).toBe(0)
  })

  it('persists state to localStorage', () => {
    renderTutorial()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    const stored = localStorage.getItem('stellar-nebula:tutorial-store')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).state.currentStep).toBe(1)
  })
})
