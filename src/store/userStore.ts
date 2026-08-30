import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { userStoreStorageKey } from './storageKeys'
import { createVersionedMigrate } from './stateMigration'

export interface UserSession {
  id: string
  handle: string
  walletAddress?: string
  roles: string[]
}

export interface UserState {
  session: UserSession | null
  isAuthenticated: boolean
}

export interface UserActions {
  setSession: (session: UserSession) => void
  updateSession: (session: Partial<UserSession>) => void
  clearSession: () => void
}

export type UserStore = UserState & UserActions

export { userStoreStorageKey }

/** Bump whenever the shape of the persisted UserState slice changes. */
export const USER_STORE_SCHEMA_VERSION = 1

export const initialUserState: UserState = {
  session: null,
  isAuthenticated: false,
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...initialUserState,
      setSession: (session) => set({ session, isAuthenticated: true }),
      updateSession: (sessionUpdate) =>
        set((state) => {
          if (!state.session) {
            return state
          }

          return {
            session: {
              ...state.session,
              ...sessionUpdate,
            },
          }
        }),
      clearSession: () => set(initialUserState),
    }),
    {
      name: userStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      version: USER_STORE_SCHEMA_VERSION,
      partialize: ({ session, isAuthenticated }) => ({ session, isAuthenticated }),
      migrate: createVersionedMigrate('userStore', USER_STORE_SCHEMA_VERSION, (state) => ({
        ...initialUserState,
        ...(state as Partial<UserState>),
      })),
    }
  )
)
