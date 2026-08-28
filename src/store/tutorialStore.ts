import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { tutorialStoreKey } from './storageKeys'

export interface TutorialState {
  completed: boolean
  currentStep: number
  dismissed: boolean
  startedAt: string | null
}

export interface TutorialActions {
  setStep: (step: number) => void
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
      complete: () => set({ completed: true, dismissed: true }),
      dismiss: () => set({ dismissed: true }),
      replay: () => set({ completed: false, dismissed: false, currentStep: 0, startedAt: null }),
    }),
    {
      name: tutorialStoreKey,
      storage: createJSONStorage(() => localStorage),
      version: TUTORIAL_STORE_SCHEMA_VERSION,
      migrate: (persistedState) => ({
        ...initialTutorialState,
        ...(persistedState as Partial<TutorialState>),
      }),
    }
  )
)
