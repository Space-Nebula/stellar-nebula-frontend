import { faker } from '@faker-js/faker'
import type { Ship, ShipClass, ShipStats } from '@/types/game'

const SHIP_CLASSES: ShipClass[] = ['scout', 'freighter', 'warship', 'explorer']

const BASE_STATS: Record<ShipClass, ShipStats> = {
  scout: { speed: 90, shield: 40, hull: 50, cargoCapacity: 30, weaponPower: 25 },
  freighter: { speed: 40, shield: 60, hull: 80, cargoCapacity: 200, weaponPower: 10 },
  warship: { speed: 60, shield: 90, hull: 90, cargoCapacity: 50, weaponPower: 95 },
  explorer: { speed: 70, shield: 50, hull: 60, cargoCapacity: 80, weaponPower: 30 },
}

const SHIP_NAME_PREFIXES = [
  'Stellar',
  'Nova',
  'Void',
  'Astral',
  'Cosmic',
  'Nebula',
  'Solar',
  'Lunar',
]
const SHIP_NAME_SUFFIXES = [
  'Hawk',
  'Serpent',
  'Titan',
  'Phantom',
  'Raven',
  'Viper',
  'Crusader',
  'Nomad',
]

export interface ShipFactoryOverrides {
  id?: string
  name?: string
  class?: ShipClass
  stats?: Partial<ShipStats>
  currentShield?: number
  currentHull?: number
  cargoLoaded?: number
  ownerPublicKey?: string
}

export function buildShip(overrides: ShipFactoryOverrides = {}): Ship {
  const shipClass = overrides.class ?? faker.helpers.arrayElement(SHIP_CLASSES)
  const baseStats = BASE_STATS[shipClass]

  const stats: ShipStats = {
    speed: overrides.stats?.speed ?? baseStats.speed,
    shield: overrides.stats?.shield ?? baseStats.shield,
    hull: overrides.stats?.hull ?? baseStats.hull,
    cargoCapacity: overrides.stats?.cargoCapacity ?? baseStats.cargoCapacity,
    weaponPower: overrides.stats?.weaponPower ?? baseStats.weaponPower,
  }

  const maxShield = stats.shield
  const maxHull = stats.hull
  const currentShield = overrides.currentShield ?? faker.number.int({ min: 0, max: maxShield })
  const currentHull = overrides.currentHull ?? faker.number.int({ min: 1, max: maxHull })

  return {
    id: overrides.id ?? faker.string.uuid(),
    name:
      overrides.name ??
      `${faker.helpers.arrayElement(SHIP_NAME_PREFIXES)} ${faker.helpers.arrayElement(SHIP_NAME_SUFFIXES)}`,
    class: shipClass,
    stats,
    currentShield,
    currentHull,
    cargoLoaded: overrides.cargoLoaded ?? faker.number.int({ min: 0, max: stats.cargoCapacity }),
    ownerPublicKey:
      overrides.ownerPublicKey ?? faker.string.alphanumeric({ length: 56, casing: 'upper' }),
  }
}

export function buildShipList(count = 3, overrides: ShipFactoryOverrides = {}): Ship[] {
  return Array.from({ length: count }, () => buildShip(overrides))
}
