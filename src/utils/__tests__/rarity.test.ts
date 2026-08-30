import { describe, it, expect } from 'vitest'
import {
  rollRarity,
  rollResourceAmount,
  getResourceRarity,
  getBaseScanAmount,
  getRarityColor,
  getRarityLabel,
  rollScanReward,
} from '../rarity'
import { createRNG } from '../procedural/nebula'

describe('Rarity System', () => {
  describe('rollRarity', () => {
    it('returns a valid rarity tier', () => {
      const rng = createRNG(42)
      for (let i = 0; i < 1000; i++) {
        const rarity = rollRarity(rng)
        expect(['common', 'rare', 'legendary']).toContain(rarity)
      }
    })

    it('is deterministic with the same seed', () => {
      const rng1 = createRNG(42)
      const rng2 = createRNG(42)
      const results1 = Array.from({ length: 100 }, () => rollRarity(rng1))
      const results2 = Array.from({ length: 100 }, () => rollRarity(rng2))
      expect(results1).toEqual(results2)
    })

    it('produces mostly common results with default weights', () => {
      const rng = createRNG(42)
      const counts = { common: 0, rare: 0, legendary: 0 }
      const samples = 10000

      for (let i = 0; i < samples; i++) {
        counts[rollRarity(rng)]++
      }

      expect(counts.common).toBeGreaterThan(samples * 0.5)
      expect(counts.rare).toBeGreaterThan(samples * 0.1)
      expect(counts.legendary).toBeGreaterThan(0)
      expect(counts.legendary).toBeLessThan(samples * 0.15)
    })

    it('respects custom weights', () => {
      const rng = createRNG(42)
      const counts = { common: 0, rare: 0, legendary: 0 }
      const samples = 10000

      const config = {
        weights: { common: 0.1, rare: 0.1, legendary: 0.8 },
      }

      for (let i = 0; i < samples; i++) {
        counts[rollRarity(rng, config)]++
      }

      expect(counts.legendary).toBeGreaterThan(samples * 0.5)
    })
  })

  describe('rollResourceAmount', () => {
    it('returns base amount for common rarity', () => {
      expect(rollResourceAmount(50, 'common')).toBe(50)
    })

    it('returns 2x base for rare rarity', () => {
      expect(rollResourceAmount(50, 'rare')).toBe(100)
    })

    it('returns 5x base for legendary rarity', () => {
      expect(rollResourceAmount(50, 'legendary')).toBe(250)
    })

    it('floors fractional results', () => {
      expect(rollResourceAmount(33, 'rare')).toBe(66)
      expect(rollResourceAmount(33, 'legendary')).toBe(165)
    })
  })

  describe('getResourceRarity', () => {
    it('returns common for nebulite', () => {
      expect(getResourceRarity('nebulite')).toBe('common')
    })

    it('returns rare for stellarium', () => {
      expect(getResourceRarity('stellarium')).toBe('rare')
    })

    it('returns rare for voidcrystal', () => {
      expect(getResourceRarity('voidcrystal')).toBe('rare')
    })

    it('returns legendary for darkMatter', () => {
      expect(getResourceRarity('darkMatter')).toBe('legendary')
    })
  })

  describe('getBaseScanAmount', () => {
    it('returns 50 for nebulite', () => {
      expect(getBaseScanAmount('nebulite')).toBe(50)
    })

    it('returns 30 for stellarium', () => {
      expect(getBaseScanAmount('stellarium')).toBe(30)
    })

    it('returns 40 for voidcrystal', () => {
      expect(getBaseScanAmount('voidcrystal')).toBe(40)
    })

    it('returns 25 for darkMatter', () => {
      expect(getBaseScanAmount('darkMatter')).toBe(25)
    })
  })

  describe('getRarityColor', () => {
    it('returns gray for common', () => {
      expect(getRarityColor('common')).toBe('#9ca3af')
    })

    it('returns blue for rare', () => {
      expect(getRarityColor('rare')).toBe('#60a5fa')
    })

    it('returns gold for legendary', () => {
      expect(getRarityColor('legendary')).toBe('#fbbf24')
    })
  })

  describe('getRarityLabel', () => {
    it('returns correct labels', () => {
      expect(getRarityLabel('common')).toBe('Common')
      expect(getRarityLabel('rare')).toBe('Rare')
      expect(getRarityLabel('legendary')).toBe('Legendary')
    })
  })

  describe('rollScanReward', () => {
    it('returns a valid resource rarity entry', () => {
      const rng = createRNG(42)
      const reward = rollScanReward('nebulite', rng)

      expect(reward.resource).toBe('nebulite')
      expect(['common', 'rare', 'legendary']).toContain(reward.rarity)
      expect(reward.baseAmount).toBe(50)
    })

    it('returns base amount unmodified (scaling done by caller)', () => {
      const rng = createRNG(42)

      for (let i = 0; i < 100; i++) {
        const reward = rollScanReward('stellarium', rng)
        expect(reward.baseAmount).toBe(30)
        const scaled = rollResourceAmount(reward.baseAmount, reward.rarity)
        if (reward.rarity === 'common') {
          expect(scaled).toBe(30)
        } else if (reward.rarity === 'rare') {
          expect(scaled).toBe(60)
        } else {
          expect(scaled).toBe(150)
        }
      }
    })
  })
})
