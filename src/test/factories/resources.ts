import { faker } from '@faker-js/faker'
import type { Resource, ResourceType, CargoItem } from '@/types/game'

const RESOURCE_TYPES: ResourceType[] = ['nebulite', 'stellarium', 'voidcrystal', 'darkMatter']

const BASE_VALUES: Record<ResourceType, number> = {
  nebulite: 10,
  stellarium: 25,
  voidcrystal: 50,
  darkMatter: 100,
}

export interface ResourceFactoryOverrides {
  type?: ResourceType
  amount?: number
  baseValue?: number
}

export function buildResource(overrides: ResourceFactoryOverrides = {}): Resource {
  const type = overrides.type ?? faker.helpers.arrayElement(RESOURCE_TYPES)

  return {
    type,
    amount: overrides.amount ?? faker.number.int({ min: 10, max: 1000 }),
    baseValue: overrides.baseValue ?? BASE_VALUES[type],
  }
}

export function buildResourceList(count = 4, overrides: ResourceFactoryOverrides = {}): Resource[] {
  return Array.from({ length: count }, () => buildResource(overrides))
}

export function buildResourcePool(
  overrides: Partial<Record<ResourceType, ResourceFactoryOverrides>> = {}
): Resource[] {
  return RESOURCE_TYPES.map((type) => buildResource({ type, ...overrides[type] }))
}

export interface CargoItemOverrides {
  resource?: ResourceType
  quantity?: number
}

export function buildCargoItem(overrides: CargoItemOverrides = {}): CargoItem {
  return {
    resource: overrides.resource ?? faker.helpers.arrayElement(RESOURCE_TYPES),
    quantity: overrides.quantity ?? faker.number.int({ min: 1, max: 100 }),
  }
}

export function buildCargoList(count = 3, overrides: CargoItemOverrides = {}): CargoItem[] {
  return Array.from({ length: count }, () => buildCargoItem(overrides))
}
