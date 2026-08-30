import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { tutorialStoreKey } from './storageKeys'
import { createVersionedMigrate } from './stateMigration'

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

export { tutorialStoreKey }

/** Bump whenever the shape of the persisted TutorialState slice changes. */
export const TUTORIAL_STORE_SCHEMA_VERSION = 1

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
      version: TUTORIAL_STORE_SCHEMA_VERSION,
      partialize: ({ completed, currentStep, dismissed, startedAt, completedObjectives }) => ({
        completed,
        currentStep,
        dismissed,
        startedAt,
        completedObjectives,
      }),
      migrate: createVersionedMigrate('tutorialStore', TUTORIAL_STORE_SCHEMA_VERSION, (state) => ({
        ...initialTutorialState,
        ...(state as Partial<TutorialState>),
      })),
    }
  )
)
