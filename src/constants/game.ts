/**
 * Game mechanics constants for Stellar Nebula.
 * Centralises all magic numbers so they're easy to tune.
 */

// ─── Ship ────────────────────────────────────────────────────────────────────

/** Base movement speed (units / second) */
export const SHIP_BASE_SPEED = 5

/** Maximum boost multiplier applied on top of base speed */
export const SHIP_MAX_BOOST = 3

/** Shield regeneration rate (points / second) */
export const SHIP_SHIELD_REGEN_RATE = 2

/** Maximum shield points */
export const SHIP_MAX_SHIELD = 100

/** Maximum hull integrity points */
export const SHIP_MAX_HULL = 200

// ─── Resources ───────────────────────────────────────────────────────────────

/** Base cost to mine one unit of Nebulite */
export const RESOURCE_MINE_COST = 10

/** Base sell price for one unit of Nebulite */
export const RESOURCE_SELL_PRICE = 25

/** Maximum cargo capacity (units) */
export const CARGO_MAX_CAPACITY = 500

// ─── Nebula ───────────────────────────────────────────────────────────────────

/** Radius of a standard nebula zone (world units) */
export const NEBULA_ZONE_RADIUS = 50

/** Density multiplier for particle effects inside a nebula */
export const NEBULA_PARTICLE_DENSITY = 0.8

/** Visibility reduction factor inside a nebula (0–1) */
export const NEBULA_VISIBILITY_FACTOR = 0.4

// ─── Economy ─────────────────────────────────────────────────────────────────

/** Starting credits for a new player */
export const ECONOMY_STARTING_CREDITS = 1000

/** Transaction fee percentage (0–1) */
export const ECONOMY_TX_FEE = 0.01

/** Maximum credits a player can hold */
export const ECONOMY_MAX_CREDITS = 1_000_000

// ─── Scan Cooldown ───────────────────────────────────────────────────────────

/** Default cooldown between scans (milliseconds) */
export const SCAN_COOLDOWN_MS = 60_000

/** Scan channel duration (seconds) */
export const SCAN_CHANNEL_DURATION_SEC = 2

// ─── Rarity ──────────────────────────────────────────────────────────────────

/** Rarity weight distribution for scan drops */
export const RARITY_WEIGHTS = {
  common: 0.7,
  rare: 0.25,
  legendary: 0.05,
} as const

/** Amount multiplier per rarity tier */
export const RARITY_MULTIPLIERS = {
  common: 1,
  rare: 2,
  legendary: 5,
} as const
