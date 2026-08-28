import type { RarityTier, ResourceType } from '@/types/game'

export interface RarityConfig {
  weights: Record<RarityTier, number>
}

export interface ResourceRarityEntry {
  resource: ResourceType
  rarity: RarityTier
  baseAmount: number
}

const DEFAULT_RARITY_WEIGHTS: Record<RarityTier, number> = {
  common: 0.7,
  rare: 0.25,
  legendary: 0.05,
}

const RARITY_MULTIPLIERS: Record<RarityTier, number> = {
  common: 1,
  rare: 2,
  legendary: 5,
}

const RARITY_COLORS: Record<RarityTier, string> = {
  common: '#9ca3af',
  rare: '#60a5fa',
  legendary: '#fbbf24',
}

const RARITY_LABELS: Record<RarityTier, string> = {
  common: 'Common',
  rare: 'Rare',
  legendary: 'Legendary',
}

const RESOURCE_RARITY_MAP: Record<ResourceType, RarityTier> = {
  nebulite: 'common',
  stellarium: 'rare',
  voidcrystal: 'rare',
  darkMatter: 'legendary',
}

const BASE_SCAN_AMOUNTS: Record<ResourceType, number> = {
  nebulite: 50,
  stellarium: 30,
  voidcrystal: 40,
  darkMatter: 25,
}

export function rollRarity(rng: () => number, config?: RarityConfig): RarityTier {
  const weights = config?.weights ?? DEFAULT_RARITY_WEIGHTS
  const totalWeight = weights.common + weights.rare + weights.legendary
  const roll = rng() * totalWeight

  let cumulative = weights.common
  if (roll < cumulative) return 'common'

  cumulative += weights.rare
  if (roll < cumulative) return 'rare'

  return 'legendary'
}

export function rollResourceAmount(base: number, rarity: RarityTier): number {
  const multiplier = RARITY_MULTIPLIERS[rarity]
  return Math.floor(base * multiplier)
}

export function getResourceRarity(resourceType: ResourceType): RarityTier {
  return RESOURCE_RARITY_MAP[resourceType]
}

export function getBaseScanAmount(resourceType: ResourceType): number {
  return BASE_SCAN_AMOUNTS[resourceType]
}

export function getRarityColor(tier: RarityTier): string {
  return RARITY_COLORS[tier]
}

export function getRarityLabel(tier: RarityTier): string {
  return RARITY_LABELS[tier]
}

export function rollScanReward(
  resourceType: ResourceType,
  rng: () => number,
  config?: RarityConfig
): ResourceRarityEntry {
  const rarity = rollRarity(rng, config)
  const baseAmount = getBaseScanAmount(resourceType)
  return { resource: resourceType, rarity, baseAmount }
}
