import {
  useGameStore,
  initialGameState,
  gameStoreStorageKey,
  type GameState,
  useShipStore,
  initialShipState,
  shipStoreStorageKey,
  type ShipState,
  useResourceStore,
  initialResourceState,
  resourceStoreStorageKey,
  type ResourceState,
  useSettingsStore,
  initialSettingsState,
  settingsStoreKey,
  type SettingsState,
  useUserStore,
  initialUserState,
  userStoreStorageKey,
  type UserState,
  useSessionStore,
  initialSessionState,
  sessionStoreStorageKey,
  type SessionState,
  useGraphicsStore,
  initialGraphicsState,
  graphicsStoreStorageKey,
  type GraphicsState,
  useTutorialStore,
  initialTutorialState,
  tutorialStoreKey,
  type TutorialState,
  useAchievementStore,
  initialAchievementState,
  achievementStoreStorageKey,
  type AchievementState,
} from '@/store'
import { logger } from './logging'

/** Bumped whenever the shape of the aggregate save bundle changes. */
export const SAVE_FORMAT_VERSION = 1

interface StoreSlice<T extends object> {
  /** Key under which this slice appears in an exported save bundle. */
  name: string
  /** The localStorage key zustand's `persist` middleware writes to. */
  storageKey: string
  getState: () => T
  setState: (partial: Partial<T>) => void
  getDefaults: () => T
  /** Structural check that a value is at least plausibly a T. */
  isValid: (value: unknown) => value is T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const gameSlice: StoreSlice<GameState> = {
  name: 'game',
  storageKey: gameStoreStorageKey,
  getState: () => useGameStore.getState(),
  setState: (partial) => useGameStore.setState(partial),
  getDefaults: () => initialGameState,
  isValid: (value): value is GameState =>
    isRecord(value) &&
    typeof value.phase === 'string' &&
    Array.isArray(value.scanCooldowns) &&
    typeof value.elapsedSeconds === 'number',
}

const shipSlice: StoreSlice<ShipState> = {
  name: 'ship',
  storageKey: shipStoreStorageKey,
  getState: () => useShipStore.getState(),
  setState: (partial) => useShipStore.setState(partial),
  getDefaults: () => initialShipState,
  isValid: (value): value is ShipState => isRecord(value) && Array.isArray(value.ships),
}

const resourceSlice: StoreSlice<ResourceState> = {
  name: 'resource',
  storageKey: resourceStoreStorageKey,
  getState: () => useResourceStore.getState(),
  setState: (partial) => useResourceStore.setState(partial),
  getDefaults: () => initialResourceState,
  isValid: (value): value is ResourceState =>
    isRecord(value) && isRecord(value.inventory) && Array.isArray(value.harvestLog),
}

const settingsSlice: StoreSlice<SettingsState> = {
  name: 'settings',
  storageKey: settingsStoreKey,
  getState: () => useSettingsStore.getState(),
  setState: (partial) => useSettingsStore.setState(partial),
  getDefaults: () => initialSettingsState,
  isValid: (value): value is SettingsState =>
    isRecord(value) &&
    typeof value.graphicsQuality === 'string' &&
    typeof value.network === 'string',
}

const userSlice: StoreSlice<UserState> = {
  name: 'user',
  storageKey: userStoreStorageKey,
  getState: () => useUserStore.getState(),
  setState: (partial) => useUserStore.setState(partial),
  getDefaults: () => initialUserState,
  isValid: (value): value is UserState =>
    isRecord(value) && typeof value.isAuthenticated === 'boolean',
}

const sessionSlice: StoreSlice<SessionState> = {
  name: 'session',
  storageKey: sessionStoreStorageKey,
  getState: () => useSessionStore.getState(),
  setState: (partial) => useSessionStore.setState(partial),
  getDefaults: () => initialSessionState,
  isValid: (value): value is SessionState =>
    isRecord(value) && (value.session === null || isRecord(value.session)),
}

const graphicsSlice: StoreSlice<GraphicsState> = {
  name: 'graphics',
  storageKey: graphicsStoreStorageKey,
  getState: () => useGraphicsStore.getState(),
  setState: (partial) => useGraphicsStore.setState(partial),
  getDefaults: () => initialGraphicsState,
  isValid: (value): value is GraphicsState =>
    isRecord(value) && typeof value.bloomIntensity === 'number',
}

const tutorialSlice: StoreSlice<TutorialState> = {
  name: 'tutorial',
  storageKey: tutorialStoreKey,
  getState: () => useTutorialStore.getState(),
  setState: (partial) => useTutorialStore.setState(partial),
  getDefaults: () => initialTutorialState,
  isValid: (value): value is TutorialState =>
    isRecord(value) && typeof value.completed === 'boolean',
}

const achievementSlice: StoreSlice<AchievementState> = {
  name: 'achievement',
  storageKey: achievementStoreStorageKey,
  getState: () => useAchievementStore.getState(),
  setState: (partial) => useAchievementStore.setState(partial),
  getDefaults: () => initialAchievementState,
  isValid: (value): value is AchievementState =>
    isRecord(value) && isRecord(value.stats) && isRecord(value.unlockedAtById),
}

/** Every persisted slice the save/load system knows about, keyed by name. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: StoreSlice<any>[] = [
  gameSlice,
  shipSlice,
  resourceSlice,
  settingsSlice,
  userSlice,
  sessionSlice,
  graphicsSlice,
  tutorialSlice,
  achievementSlice,
]

export type SliceName = (typeof REGISTRY)[number]['name']

export interface SaveBundle {
  formatVersion: number
  savedAt: string
  slices: Record<string, unknown>
}

/**
 * Build an exportable snapshot of the requested slices (all by default).
 * Reads live store state, not raw localStorage, so it always reflects the
 * current in-memory session.
 */
export function exportSave(sliceNames?: SliceName[]): SaveBundle {
  const wanted = sliceNames ? REGISTRY.filter((s) => sliceNames.includes(s.name)) : REGISTRY

  const slices: Record<string, unknown> = {}
  for (const slice of wanted) {
    slices[slice.name] = slice.getState()
  }

  return {
    formatVersion: SAVE_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    slices,
  }
}

export interface ImportResult {
  applied: string[]
  skipped: { name: string; reason: string }[]
}

/**
 * Validate and apply a previously exported bundle back into the live stores.
 * Any slice that fails validation is skipped (not applied) rather than
 * throwing, so a partially-corrupted import doesn't clobber a healthy game.
 */
export function importSave(bundle: unknown): ImportResult {
  const result: ImportResult = { applied: [], skipped: [] }

  if (!isRecord(bundle) || !isRecord(bundle.slices) || typeof bundle.formatVersion !== 'number') {
    result.skipped.push({ name: '*', reason: 'Malformed save bundle' })
    return result
  }

  if (bundle.formatVersion > SAVE_FORMAT_VERSION) {
    result.skipped.push({
      name: '*',
      reason: `Save was created by a newer app version (v${bundle.formatVersion})`,
    })
    return result
  }

  for (const slice of REGISTRY) {
    const value = bundle.slices[slice.name]
    if (value === undefined) continue

    if (!slice.isValid(value)) {
      result.skipped.push({ name: slice.name, reason: 'Failed schema validation' })
      logger.warn('Skipped importing invalid save slice', { slice: slice.name })
      continue
    }

    slice.setState(value)
    result.applied.push(slice.name)
  }

  return result
}

/** Serialize a save bundle for download / clipboard / file storage. */
export function serializeSave(bundle: SaveBundle): string {
  return JSON.stringify(bundle, null, 2)
}

/** Trigger a browser download of the current save state as a JSON file. */
export function downloadSave(filename = 'stellar-nebula-save.json', sliceNames?: SliceName[]) {
  const bundle = exportSave(sliceNames)
  const blob = new Blob([serializeSave(bundle)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Read a save file (as produced by {@link downloadSave}) and apply it. */
export async function importSaveFromFile(file: File): Promise<ImportResult> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    logger.error('Failed to parse save file', error as Error)
    return { applied: [], skipped: [{ name: '*', reason: 'File is not valid JSON' }] }
  }

  return importSave(parsed)
}

export interface RepairReport {
  checked: string[]
  cleared: { key: string; reason: string }[]
}

/**
 * Scan raw localStorage for every known persisted store and remove any entry
 * that is corrupted (not valid JSON) or fails structural validation, so a
 * broken save can't crash hydration on next launch. Safe to call before any
 * store has been created/hydrated.
 */
export function repairCorruptedSaveData(): RepairReport {
  const report: RepairReport = { checked: [], cleared: [] }

  for (const slice of REGISTRY) {
    report.checked.push(slice.storageKey)
    const raw = window.localStorage.getItem(slice.storageKey)
    if (raw === null) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      window.localStorage.removeItem(slice.storageKey)
      report.cleared.push({ key: slice.storageKey, reason: 'Invalid JSON' })
      continue
    }

    // zustand's persist middleware wraps the slice as { state, version }.
    const persistedState = isRecord(parsed) ? parsed.state : undefined
    if (!slice.isValid(persistedState)) {
      window.localStorage.removeItem(slice.storageKey)
      report.cleared.push({ key: slice.storageKey, reason: 'Failed schema validation' })
    }
  }

  if (report.cleared.length > 0) {
    logger.warn('Cleared corrupted save data', { cleared: report.cleared })
  }

  return report
}

/** Reset every registered store to its defaults and wipe its localStorage entry. */
export function clearAllGameData(sliceNames?: SliceName[]) {
  const wanted = sliceNames ? REGISTRY.filter((s) => sliceNames.includes(s.name)) : REGISTRY

  for (const slice of wanted) {
    slice.setState(slice.getDefaults())
    window.localStorage.removeItem(slice.storageKey)
  }
}
