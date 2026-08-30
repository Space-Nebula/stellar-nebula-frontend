import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import { sessionStoreStorageKey } from './storageKeys'
import { trackEvent } from '@/services/analytics'
import { createVersionedMigrate } from './stateMigration'

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

export type SyncStatus = 'idle' | 'synced' | 'pending' | 'syncing' | 'error'

export interface SessionState {
  session: Session | null
  startTime: string | null
  duration: number
  actions: string[]
  syncStatus: SyncStatus
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
  /** Track a session action and notify analytics. */
  trackAction: (action: string) => void
  /** Update session sync status. */
  setSyncStatus: (status: SyncStatus) => void
  /** Calculate and update elapsed duration in seconds. */
  updateDuration: () => number
  /** Get current duration in seconds. */
  getDuration: () => number
}

export type SessionStore = SessionState & SessionActions

export { sessionStoreStorageKey }

/** Bump whenever the shape of the persisted SessionState slice changes. */
export const SESSION_STORE_SCHEMA_VERSION = 2

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

const DEFAULT_PREFERENCES: SessionPreferences = {
  theme: 'dark',
  notificationsEnabled: true,
  soundEnabled: true,
  autoConnectWallet: false,
}

export const initialSessionState: SessionState = {
  session: null,
  startTime: null,
  duration: 0,
  actions: [],
  syncStatus: 'idle',
}

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialSessionState,

        openSession: (walletAddress, ttlMs = DEFAULT_TTL_MS) => {
          const now = new Date()
          const startTime = now.toISOString()
          set({
            session: {
              walletAddress,
              lastLogin: startTime,
              expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
              preferences: DEFAULT_PREFERENCES,
            },
            startTime,
            duration: 0,
            actions: ['session_started'],
            syncStatus: 'synced',
          })
          try {
            trackEvent('scan_started', { action: 'session_open' })
          } catch {
            // Analytics safe fallthrough
          }
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

        closeSession: () => {
          try {
            trackEvent('scan_completed', { action: 'session_close' })
          } catch {
            // Analytics safe fallthrough
          }
          set(initialSessionState)
        },

        isExpired: () => {
          const { session } = get()
          if (!session) return true
          return Date.now() >= new Date(session.expiresAt).getTime()
        },

        trackAction: (action) => {
          const { startTime, actions } = get()
          const duration = startTime
            ? Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
            : 0
          set({
            actions: [...actions, action],
            duration,
          })
          try {
            trackEvent('scan_started', { action })
          } catch {
            // Analytics safe fallthrough
          }
        },

        setSyncStatus: (syncStatus) => set({ syncStatus }),

        updateDuration: () => {
          const { startTime } = get()
          const duration = startTime
            ? Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
            : 0
          set({ duration })
          return duration
        },

        getDuration: () => {
          const { startTime, duration } = get()
          if (!startTime) return duration
          return Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
        },
      }),
      {
        name: sessionStoreStorageKey,
        storage: createJSONStorage(() => localStorage),
        version: SESSION_STORE_SCHEMA_VERSION,
        partialize: ({ session, startTime, duration, actions, syncStatus }) => ({
          session,
          startTime,
          duration,
          actions,
          syncStatus,
        }),
        migrate: createVersionedMigrate('sessionStore', SESSION_STORE_SCHEMA_VERSION, (state) => ({
        ...initialSessionState,
        ...(state as Partial<SessionState>),
      })),
      }
    ),
    { name: 'SessionStore', enabled: isDev }
  )
)
