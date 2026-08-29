import { faker } from '@faker-js/faker'
import type { GameState, GamePhase, PlayerProfile, NebulaZone, NebulaType } from '@/types/game'
import { buildShipList } from './ships'
import { buildCargoList } from './resources'

const GAME_PHASES: GamePhase[] = ['loading', 'menu', 'playing', 'paused', 'gameover']
const NEBULA_TYPES: NebulaType[] = ['emission', 'reflection', 'dark', 'planetary']

export interface PlayerProfileOverrides {
  publicKey?: string
  username?: string
  credits?: number
  createdAt?: string
}

export function buildPlayerProfile(overrides: PlayerProfileOverrides = {}): PlayerProfile {
  return {
    publicKey: overrides.publicKey ?? faker.string.alphanumeric(56),
    username: overrides.username ?? faker.internet.username(),
    credits: overrides.credits ?? faker.number.int({ min: 100, max: 10000 }),
    ships: buildShipList(faker.number.int({ min: 1, max: 3 })),
    cargo: buildCargoList(faker.number.int({ min: 0, max: 5 })),
    createdAt: overrides.createdAt ?? faker.date.past().toISOString(),
  }
}

export interface NebulaZoneOverrides {
  id?: string
  name?: string
  type?: NebulaType
  radius?: number
  resourceDensity?: number
  isActive?: boolean
}

export function buildNebulaZone(overrides: NebulaZoneOverrides = {}): NebulaZone {
  return {
    id: overrides.id ?? faker.string.uuid(),
    name: overrides.name ?? faker.location.city(),
    type: overrides.type ?? faker.helpers.arrayElement(NEBULA_TYPES),
    position: [
      faker.number.float({ min: -1000, max: 1000 }),
      faker.number.float({ min: -1000, max: 1000 }),
      faker.number.float({ min: -1000, max: 1000 })
    ],
    radius: overrides.radius ?? faker.number.float({ min: 10, max: 500 }),
    resourceDensity: overrides.resourceDensity ?? faker.number.float({ min: 0, max: 1 }),
    isActive: overrides.isActive ?? faker.datatype.boolean(),
  }
}

export interface GameStateOverrides {
  phase?: GamePhase
  elapsedTime?: number
}

export function buildGameState(overrides: GameStateOverrides = {}): GameState {
  return {
    phase: overrides.phase ?? faker.helpers.arrayElement(GAME_PHASES),
    player: buildPlayerProfile(),
    activeNebulaZone: buildNebulaZone(),
    elapsedTime: overrides.elapsedTime ?? faker.number.int({ min: 0, max: 3600 }),
  }
}
