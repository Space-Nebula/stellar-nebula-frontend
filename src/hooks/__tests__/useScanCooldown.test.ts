import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScanCooldown } from '../useScanCooldown'
import { useGameStore, initialGameState } from '@/store/gameStore'

describe('useScanCooldown', () => {
  beforeEach(() => {
    useGameStore.setState(initialGameState)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 remaining seconds when no cooldown is active', () => {
    const { result } = renderHook(() => useScanCooldown())
    expect(result.current.getRemainingSeconds('scan-1')).toBe(0)
  })

  it('returns true for canScan when no cooldown is active', () => {
    const { result } = renderHook(() => useScanCooldown())
    expect(result.current.canScan('scan-1')).toBe(true)
  })

  it('starts a cooldown and shows remaining seconds', () => {
    const { result } = renderHook(() => useScanCooldown())

    act(() => {
      result.current.startCooldown('scan-1', 5000)
    })

    expect(result.current.canScan('scan-1')).toBe(false)
    expect(result.current.getRemainingSeconds('scan-1')).toBeGreaterThan(0)
  })

  it('canScan returns true after cooldown expires', () => {
    const { result } = renderHook(() => useScanCooldown())

    act(() => {
      result.current.startCooldown('scan-1', 1000)
    })

    expect(result.current.canScan('scan-1')).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.canScan('scan-1')).toBe(true)
  })

  it('pruneExpiredCooldowns removes expired entries', () => {
    const { result } = renderHook(() => useScanCooldown())

    act(() => {
      result.current.startCooldown('scan-1', 1000)
    })

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    act(() => {
      result.current.pruneExpiredCooldowns()
    })

    expect(result.current.getRemainingSeconds('scan-1')).toBe(0)
  })
})
