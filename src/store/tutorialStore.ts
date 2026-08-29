import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type TutorialObjective = 'connect-wallet' | 'first-scan' | 'first-upgrade'

export interface TutorialState {
  completed: boolean
  currentStep: number
  dismissed: boolean
  startedAt: string | null
  completedObjectives: TutorialObjective[]
}

export interface TutorialActions {
  setStep: (step: number) => void
  completeObjective: (objective: TutorialObjective) => void
  complete: () => void
  dismiss: () => void
  replay: () => void
}

export type TutorialStore = TutorialState & TutorialActions

export const tutorialStoreKey = 'stellar-nebula:tutorial-store'

export const initialTutorialState: TutorialState = {
  completed: false,
  currentStep: 0,
  dismissed: false,
  startedAt: null,
  completedObjectives: [],
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set) => ({
      ...initialTutorialState,
      setStep: (currentStep) =>
        set((state) => ({
          currentStep,
          startedAt: state.startedAt ?? new Date().toISOString(),
        })),
      completeObjective: (objective) =>
        set((state) => ({
          completedObjectives: state.completedObjectives.includes(objective)
            ? state.completedObjectives
            : [...state.completedObjectives, objective],
        })),
      complete: () => set({ completed: true, dismissed: true }),
      dismiss: () => set({ dismissed: true }),
      replay: () =>
        set({
          completed: false,
          dismissed: false,
          currentStep: 0,
          startedAt: null,
          completedObjectives: [],
        }),
    }),
    {
      name: tutorialStoreKey,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
