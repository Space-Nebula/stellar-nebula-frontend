import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore, initialGameState, DEFAULT_SCAN_COOLDOWN_MS } from '../gameStore'

/**
 * `addScanCooldown` is the enforcement point for scan rate limiting, so its
 * edge cases are the difference between a limit and a suggestion.
 *
 * The behaviours pinned here are the ones that decide which side of the line a
 * caller ends up on:
 *
 *  - a cooldown is only ever *extended*, never shortened. A caller that asks for
 *    5s and then 1s must not talk itself out of the limit it was given.
 *  - a zero duration means "no cooldown" and clears the entry.
 *  - a negative or non-finite duration is a caller bug and is ignored. Clearing
 *    an active rate limit on bad input is the worse of the two failures.
 *  - expired entries are dropped as writes pass through, so the persisted list
 *    cannot grow without bound between explicit prunes.
 */
const cooldowns = () => useGameStore.getState().scanCooldowns
const readyAtFor = (nebulaId: string) =>
  cooldowns().find((c) => c.nebulaId === nebulaId)?.readyAt

/** Milliseconds between the store's clock and `readyAt` for one entry. */
const remainingMs = (nebulaId: string): number | null => {
  const readyAt = readyAtFor(nebulaId)
  return readyAt === undefined ? null : new Date(readyAt).getTime() - Date.now()
}

describe('addScanCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'))
    useGameStore.setState(initialGameState)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds an entry for a nebula with no cooldown', () => {
    useGameStore.getState().addScanCooldown('neb-1', 1000)

    expect(cooldowns()).toHaveLength(1)
    expect(readyAtFor('neb-1')).toBe('2026-09-27T12:00:01.000Z')
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)
  })

  it('uses the 60s default when no duration is given', () => {
    useGameStore.getState().addScanCooldown('neb-1')

    expect(DEFAULT_SCAN_COOLDOWN_MS).toBe(60_000)
    expect(remainingMs('neb-1')).toBe(60_000)
  })

  it('does not duplicate an entry when the same cooldown is added twice', () => {
    useGameStore.getState().addScanCooldown('neb-1', 1000)
    useGameStore.getState().addScanCooldown('neb-1', 1000)

    expect(cooldowns()).toHaveLength(1)
    expect(remainingMs('neb-1')).toBe(1000)
  })

  it('extends an existing cooldown when a longer duration is added', () => {
    useGameStore.getState().addScanCooldown('neb-1', 1000)
    useGameStore.getState().addScanCooldown('neb-1', 5000)

    expect(cooldowns()).toHaveLength(1)
    expect(remainingMs('neb-1')).toBe(5000)
  })

  it('never shortens a live cooldown', () => {
    useGameStore.getState().addScanCooldown('neb-1', 5000)
    useGameStore.getState().addScanCooldown('neb-1', 1000)

    // The rate limit stands: a later, shorter request does not reduce it.
    expect(remainingMs('neb-1')).toBe(5000)
  })

  it('does not shorten a cooldown that was set by a different caller', () => {
    vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'))
    useGameStore.getState().addScanCooldown('neb-1', 60_000)

    vi.setSystemTime(new Date('2026-09-27T12:00:30.000Z'))
    useGameStore.getState().addScanCooldown('neb-1', 1000)

    // 30s of the original 60s remain, not the 1s just asked for.
    expect(remainingMs('neb-1')).toBe(30_000)
  })

  it('treats a zero duration as "no cooldown" and removes the entry', () => {
    useGameStore.getState().addScanCooldown('neb-1', 5000)
    useGameStore.getState().addScanCooldown('neb-1', 0)

    expect(cooldowns()).toHaveLength(0)
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)
  })

  it.each([
    ['negative', -1000],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY]
  ])('ignores a %s duration rather than clearing the cooldown', (_label, duration) => {
    useGameStore.getState().addScanCooldown('neb-1', 5000)
    useGameStore.getState().addScanCooldown('neb-1', duration)

    // Bad input must not be able to switch a rate limit off.
    expect(remainingMs('neb-1')).toBe(5000)
  })

  it('leaves state untouched when a bad duration arrives for a nebula with no entry', () => {
    const before = cooldowns()
    useGameStore.getState().addScanCooldown('neb-new', Number.NaN)

    expect(cooldowns()).toBe(before)
    expect(cooldowns()).toHaveLength(0)
  })

  it('replaces an expired entry instead of accumulating duplicates', () => {
    useGameStore.getState().addScanCooldown('neb-1', 1000)

    vi.setSystemTime(new Date('2026-09-27T12:00:05.000Z'))
    useGameStore.getState().addScanCooldown('neb-1', 2000)

    expect(cooldowns()).toHaveLength(1)
    expect(readyAtFor('neb-1')).toBe('2026-09-27T12:00:07.000Z')
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)
  })

  it('drops other nebulae entries that have already expired', () => {
    useGameStore.getState().addScanCooldown('stale', 1000)
    useGameStore.getState().addScanCooldown('live', 60_000)

    vi.setSystemTime(new Date('2026-09-27T12:00:05.000Z'))
    useGameStore.getState().addScanCooldown('fresh', 1000)

    // The expired entry is not carried forward by an unrelated write, so the
    // persisted list cannot grow without bound.
    expect(cooldowns().map((c) => c.nebulaId).sort()).toEqual(['fresh', 'live'])
  })

  it('leaves other nebulae entries untouched when extending one', () => {
    useGameStore.getState().addScanCooldown('a', 1000)
    const bReadyAt = (() => {
      useGameStore.getState().addScanCooldown('b', 60_000)
      return readyAtFor('b')
    })()

    vi.setSystemTime(new Date('2026-09-27T12:00:10.000Z'))
    useGameStore.getState().addScanCooldown('a', 5000)

    expect(readyAtFor('b')).toBe(bReadyAt)
    expect(remainingMs('a')).toBe(5000)
  })

  it('does not resurrect a nebula that was already clear', () => {
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)
    useGameStore.getState().addScanCooldown('neb-1', 1000)
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)
  })
})

describe('cooldown lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'))
    useGameStore.setState(initialGameState)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears the cooldown once the clock passes readyAt', () => {
    useGameStore.getState().addScanCooldown('neb-1', 1000)
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)

    vi.setSystemTime(new Date('2026-09-27T12:00:01.000Z'))
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)

    vi.setSystemTime(new Date('2026-09-27T12:00:30.000Z'))
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)
  })

  it('removes a single cooldown by id without touching the others', () => {
    useGameStore.getState().addScanCooldown('a', 1000)
    useGameStore.getState().addScanCooldown('b', 1000)

    useGameStore.getState().removeScanCooldown('a')

    expect(cooldowns().map((c) => c.nebulaId)).toEqual(['b'])
  })

  it('is a no-op when removing an id that has no cooldown', () => {
    useGameStore.getState().addScanCooldown('a', 1000)
    const before = cooldowns()

    useGameStore.getState().removeScanCooldown('missing')

    expect(cooldowns()).toBe(before)
  })

  it('prunes only the expired entries', () => {
    useGameStore.getState().addScanCooldown('short', 1000)
    useGameStore.getState().addScanCooldown('long', 60_000)

    vi.setSystemTime(new Date('2026-09-27T12:00:05.000Z'))
    useGameStore.getState().pruneExpiredCooldowns()

    expect(cooldowns().map((c) => c.nebulaId)).toEqual(['long'])
  })

  it('keeps every entry when the clock has not passed any of them', () => {
    useGameStore.getState().addScanCooldown('a', 1000)
    useGameStore.getState().addScanCooldown('b', 1000)

    vi.setSystemTime(new Date('2026-09-27T12:00:00.500Z'))
    useGameStore.getState().pruneExpiredCooldowns()

    expect(cooldowns()).toHaveLength(2)
  })
})
