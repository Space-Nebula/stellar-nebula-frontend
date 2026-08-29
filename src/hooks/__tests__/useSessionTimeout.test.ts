import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionTimeout } from '../useSessionTimeout'

describe('useSessionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not start timers when enabled is false', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useSessionTimeout({
        enabled: false,
        timeoutMs: 10000,
        warningMs: 2000,
        onTimeout,
      })
    )

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(result.current.isWarningOpen).toBe(false)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('triggers warning after (timeoutMs - warningMs)', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useSessionTimeout({
        enabled: true,
        timeoutMs: 10000,
        warningMs: 2000,
        onTimeout,
      })
    )

    expect(result.current.isWarningOpen).toBe(false)

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(result.current.isWarningOpen).toBe(true)
    expect(result.current.remainingWarningSeconds).toBe(2)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('triggers onTimeout when countdown expires', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useSessionTimeout({
        enabled: true,
        timeoutMs: 10000,
        warningMs: 2000,
        onTimeout,
      })
    )

    act(() => {
      vi.advanceTimersByTime(8000) // warning triggers
    })

    expect(result.current.isWarningOpen).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2100) // warning countdown completes
    })

    expect(onTimeout).toHaveBeenCalledOnce()
    expect(result.current.isWarningOpen).toBe(false)
  })

  it('resets timer when user extends session', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useSessionTimeout({
        enabled: true,
        timeoutMs: 10000,
        warningMs: 2000,
        onTimeout,
      })
    )

    act(() => {
      vi.advanceTimersByTime(8000) // warning triggers
    })

    expect(result.current.isWarningOpen).toBe(true)

    act(() => {
      result.current.extendSession()
    })

    expect(result.current.isWarningOpen).toBe(false)

    act(() => {
      vi.advanceTimersByTime(7000)
    })

    expect(result.current.isWarningOpen).toBe(false)
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
