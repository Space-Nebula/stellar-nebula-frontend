/**
 * Game domain types for Stellar Nebula.
 */

// ─── Ship ────────────────────────────────────────────────────────────────────

export type ShipClass = 'scout' | 'freighter' | 'warship' | 'explorer'

export interface ShipStats {
  speed: number
  shield: number
  hull: number
  cargoCapacity: number
  weaponPower: number
}

export interface Ship {
  id: string
  name: string
  class: ShipClass
  stats: ShipStats
  /** Current shield points */
  currentShield: number
  /** Current hull integrity */
  currentHull: number
  /** Cargo currently loaded (units) */
  cargoLoaded: number
  /** Owner's Stellar public key */
  ownerPublicKey: string
}

// ─── Nebula ───────────────────────────────────────────────────────────────────

export type NebulaType = 'emission' | 'reflection' | 'dark' | 'planetary'

export interface NebulaZone {
  id: string
  name: string
  type: NebulaType
  /** World-space centre position */
  position: [x: number, y: number, z: number]
  /** Radius of the zone in world units */
  radius: number
  /** Density of resources within this zone (0–1) */
  resourceDensity: number
  /** Whether the zone is currently accessible */
  isActive: boolean
}

// ─── Resource ────────────────────────────────────────────────────────────────

export type ResourceType = 'nebulite' | 'stellarium' | 'voidcrystal' | 'darkMatter'

export type RarityTier = 'common' | 'rare' | 'legendary'

export interface Resource {
  type: ResourceType
  /** Amount available in a deposit */
  amount: number
  /** Base market value per unit in credits */
  baseValue: number
  rarity?: RarityTier
}

export interface CargoItem {
  resource: ResourceType
  quantity: number
}

// ─── Player ──────────────────────────────────────────────────────────────────

export interface PlayerProfile {
  /** Stellar public key doubles as player ID */
  publicKey: string
  username: string
  credits: number
  /** Ships owned by the player */
  ships: Ship[]
  /** Cargo across all ships */
  cargo: CargoItem[]
  /** ISO-8601 timestamp of account creation */
  createdAt: string
}

// ─── Game State ──────────────────────────────────────────────────────────────

export type GamePhase = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover'

export interface GameState {
  phase: GamePhase
  player: PlayerProfile | null
  activeNebulaZone: NebulaZone | null
  /** Elapsed game time in seconds */
  elapsedTime: number
}
