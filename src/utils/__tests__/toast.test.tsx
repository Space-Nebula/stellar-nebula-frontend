import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const blank = vi.fn(() => 'b')
  return {
    blank,
    success: vi.fn(() => 's'),
    error: vi.fn(() => 'e'),
    loading: vi.fn(() => 'l'),
    custom: vi.fn(() => 'c'),
    dismiss: vi.fn(),
  }
})

vi.mock('react-hot-toast', () => {
  const fn = Object.assign(mocks.blank, {
    success: mocks.success,
    error: mocks.error,
    loading: mocks.loading,
    custom: mocks.custom,
    dismiss: mocks.dismiss,
  })
  return { default: fn, toast: fn }
})

import {
  ariaPropsForType,
  showError,
  showInfo,
  showSuccess,
  showToast,
  showWarning,
  TOAST_DURATION,
  TOAST_POSITION,
  TOAST_STACK_LIMIT,
} from '../toast'

const { blank, success, error, custom } = mocks

afterEach(() => {
  vi.clearAllMocks()
})

describe('toast configuration', () => {
  it('exposes a per-type duration map with sensible values', () => {
    expect(TOAST_DURATION.error).toBeGreaterThan(TOAST_DURATION.success)
    expect(TOAST_DURATION.loading).toBe(Infinity)
    expect(TOAST_STACK_LIMIT).toBeGreaterThan(0)
    expect(TOAST_POSITION).toBe('bottom-right')
  })

  it('marks errors and warnings as assertive alerts and others as polite status', () => {
    expect(ariaPropsForType('error')).toEqual({ role: 'alert', 'aria-live': 'assertive' })
    expect(ariaPropsForType('warning')).toEqual({ role: 'alert', 'aria-live': 'assertive' })
    expect(ariaPropsForType('success')).toEqual({ role: 'status', 'aria-live': 'polite' })
    expect(ariaPropsForType('info')).toEqual({ role: 'status', 'aria-live': 'polite' })
  })
})

describe('toast helpers', () => {
  it('applies the success duration, position and aria props', () => {
    showSuccess('done')
    expect(success).toHaveBeenCalledWith(
      'done',
      expect.objectContaining({
        duration: TOAST_DURATION.success,
        position: TOAST_POSITION,
        ariaProps: { role: 'status', 'aria-live': 'polite' },
      })
    )
  })

  it('applies the error duration and assertive aria props', () => {
    showError('boom')
    expect(error).toHaveBeenCalledWith(
      'boom',
      expect.objectContaining({
        duration: TOAST_DURATION.error,
        ariaProps: { role: 'alert', 'aria-live': 'assertive' },
      })
    )
  })

  it('lets callers override the duration', () => {
    showInfo('note', { duration: 999 })
    expect(blank).toHaveBeenCalledWith('note', expect.objectContaining({ duration: 999 }))
  })

  it('adds a warning icon and assertive aria props', () => {
    showWarning('careful')
    expect(blank).toHaveBeenCalledWith(
      'careful',
      expect.objectContaining({
        icon: '⚠️',
        ariaProps: { role: 'alert', 'aria-live': 'assertive' },
      })
    )
  })
})

describe('showToast', () => {
  it('routes to the typed variant for the given type', () => {
    showToast('ok', { type: 'success' })
    expect(success).toHaveBeenCalledTimes(1)
  })

  it('renders a custom toast when an action is provided', () => {
    showToast('Order cancelled', { type: 'info', action: { label: 'Undo', onClick: vi.fn() } })
    expect(custom).toHaveBeenCalledTimes(1)
    expect(blank).not.toHaveBeenCalled()
  })

  it('defaults to an info toast', () => {
    showToast('hello')
    expect(blank).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ duration: TOAST_DURATION.info })
    )
  })
})
