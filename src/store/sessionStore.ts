import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface SessionPreferences {
  theme: 'dark' | 'light'
  notificationsEnabled: boolean
  soundEnabled: boolean
  autoConnectWallet: boolean
}

export interface Session {
  walletAddress: string
  lastLogin: string // ISO-8601
  expiresAt: string // ISO-8601
  preferences: SessionPreferences
}

export interface SessionState {
  session: Session | null
}

export interface SessionActions {
  /** Open a new session for the given wallet address. ttlMs defaults to 24 h. */
  openSession: (walletAddress: string, ttlMs?: number) => void
  /** Update one or more preference fields without replacing the whole object. */
  updatePreferences: (preferences: Partial<SessionPreferences>) => void
  /** Push the expiry window forward from now. ttlMs defaults to 24 h. */
  refreshSession: (ttlMs?: number) => void
  /** End the active session. */
  closeSession: () => void
  /** Returns true when no session exists or the stored expiry has passed. */
  isExpired: () => boolean
}

export type SessionStore = SessionState & SessionActions

export const sessionStoreStorageKey = 'stellar-nebula:session-store'

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

const DEFAULT_PREFERENCES: SessionPreferences = {
  theme: 'dark',
  notificationsEnabled: true,
  soundEnabled: true,
  autoConnectWallet: false,
}

export const initialSessionState: SessionState = {
  session: null,
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialSessionState,

      openSession: (walletAddress, ttlMs = DEFAULT_TTL_MS) => {
        const now = new Date()
        set({
          session: {
            walletAddress,
            lastLogin: now.toISOString(),
            expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
            preferences: DEFAULT_PREFERENCES,
          },
        })
      },

      updatePreferences: (preferences) =>
        set((state) => {
          if (!state.session) return state
          return {
            session: {
              ...state.session,
              preferences: { ...state.session.preferences, ...preferences },
            },
          }
        }),

      refreshSession: (ttlMs = DEFAULT_TTL_MS) =>
        set((state) => {
          if (!state.session) return state
          return {
            session: {
              ...state.session,
              expiresAt: new Date(Date.now() + ttlMs).toISOString(),
            },
          }
        }),

      closeSession: () => set(initialSessionState),

      isExpired: () => {
        const { session } = get()
        if (!session) return true
        return Date.now() >= new Date(session.expiresAt).getTime()
      },
    }),
    {
      name: sessionStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ session }) => ({ session }),
    },
  ),
)
