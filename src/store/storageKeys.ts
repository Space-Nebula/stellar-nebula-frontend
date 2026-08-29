/**
 * Central registry of localStorage keys used by every zustand `persist` store.
 * Kept in its own module (no store imports) so the save/load service can
 * inspect and repair raw localStorage entries without triggering store
 * hydration as a side effect of importing this file.
 */
export const gameStoreStorageKey = 'stellar-nebula:game-store'
export const shipStoreStorageKey = 'stellar-nebula:ship-store'
export const resourceStoreStorageKey = 'stellar-nebula:resource-store'
export const settingsStoreKey = 'stellar-nebula:settings-store'
export const userStoreStorageKey = 'stellar-nebula:user-store'
export const sessionStoreStorageKey = 'stellar-nebula:session-store'
export const graphicsStoreStorageKey = 'stellar-nebula:graphics-store'
export const tutorialStoreKey = 'stellar-nebula:tutorial-store'

export const ALL_STORAGE_KEYS = [
  gameStoreStorageKey,
  shipStoreStorageKey,
  resourceStoreStorageKey,
  settingsStoreKey,
  userStoreStorageKey,
  sessionStoreStorageKey,
  graphicsStoreStorageKey,
  tutorialStoreKey,
] as const
