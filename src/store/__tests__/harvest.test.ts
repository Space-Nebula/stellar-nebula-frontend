import { beforeEach, describe, expect, it } from 'vitest'
import { initialResourceState, useResourceStore, type ResourceState } from '../resourceStore'

describe('resourceStore harvesting', () => {
  beforeEach(() => {
    useResourceStore.setState(initialResourceState)
  })

  it('credits scanned resources and keeps a harvest log', () => {
    const { getState } = useResourceStore

    getState().addHarvest('nebulite', 50)
    getState().addHarvest('darkMatter', 25)

    expect(getState().harvested).toEqual({
      nebulite: 50,
      stellarium: 0,
      voidcrystal: 0,
      darkMatter: 25,
    })
    expect(getState().harvestLog).toHaveLength(2)
    expect(getState().harvestLog[0].resourceType).toBe('darkMatter')
    expect(getState().harvestLog[0].amount).toBe(25)
    expect(getState().harvestLog[0].createdAt).toBeTruthy()
  })

  it('persists harvest state with the rest of the resource store', () => {
    useResourceStore.getState().addHarvest('voidcrystal', 40)

    const partialize = useResourceStore.persist.getOptions().partialize
    const persisted = (
      partialize ? partialize(useResourceStore.getState()) : {}
    ) as Partial<ResourceState>

    expect(persisted.harvested?.voidcrystal).toBe(40)
    expect(persisted.harvestLog).toHaveLength(1)
  })

  it('resets harvested totals and clears the log', () => {
    useResourceStore.getState().addHarvest('stellarium', 30)
    useResourceStore.getState().resetResources()

    expect(useResourceStore.getState().harvested).toEqual(initialResourceState.harvested)
    expect(useResourceStore.getState().harvestLog).toEqual([])
  })
})
