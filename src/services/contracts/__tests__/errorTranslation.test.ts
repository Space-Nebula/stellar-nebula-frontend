import { describe, expect, it } from 'vitest'
import {
  translateContractError,
  isContractErrorOfCategory,
  getContractErrorTitle,
  getContractErrorResolution,
} from '../errorTranslation'

describe('translateContractError', () => {
  it('translates auth errors to user-friendly messages', () => {
    const error = new Error('auth: unauthorized to perform this action')
    const result = translateContractError(error)

    expect(result.category).toBe('auth')
    expect(result.title).toMatch(/authorization/i)
    expect(result.resolution.length).toBeGreaterThan(0)
    expect(result.severity).toBe('error')
  })

  it('translates signature errors', () => {
    const error = new Error('invalid signature verification failed')
    const result = translateContractError(error)

    expect(result.category).toBe('auth')
    expect(result.title).toMatch(/signature/i)
  })

  it('translates insufficient balance errors', () => {
    const error = new Error('insufficient balance: not enough funds')
    const result = translateContractError(error)

    expect(result.category).toBe('insufficient')
    expect(result.title).toMatch(/balance/i)
    expect(result.resolution).toEqual(
      expect.arrayContaining([expect.stringMatching(/balance/i)])
    )
  })

  it('translates network errors', () => {
    const error = new Error('network error: connection refused')
    const result = translateContractError(error)

    expect(result.category).toBe('network')
    expect(result.title).toMatch(/network/i)
  })

  it('translates transaction expired errors', () => {
    const error = new Error('transaction timed out before confirmation')
    const result = translateContractError(error)

    expect(result.category).toBe('network')
    expect(result.title).toMatch(/expired|timeout/i)
  })

  it('translates contract not found errors', () => {
    const error = new Error('contract not found on network')
    const result = translateContractError(error)

    expect(result.category).toBe('contract')
    expect(result.title).toMatch(/not found/i)
  })

  it('translates sequence number errors', () => {
    const error = new Error('bad sequence number')
    const result = translateContractError(error)

    expect(result.category).toBe('contract')
    expect(result.title).toMatch(/sequence/i)
  })

  it('translates fee too low errors', () => {
    const error = new Error('insufficient fee: base fee too low')
    const result = translateContractError(error)

    expect(result.category).toBe('network')
    expect(result.title).toMatch(/fee/i)
    expect(result.severity).toBe('warning')
  })

  it('returns fallback for unknown errors', () => {
    const error = new Error('something completely unexpected happened')
    const result = translateContractError(error)

    expect(result.category).toBe('unknown')
    expect(result.title).toBe('Unexpected Error')
    expect(result.resolution.length).toBeGreaterThan(0)
  })

  it('handles string errors', () => {
    const result = translateContractError('auth forbidden')

    expect(result.category).toBe('auth')
    expect(result.title).toMatch(/authorization/i)
  })

  it('handles non-Error objects', () => {
    const result = translateContractError({ message: 'network error' })

    expect(result.category).toBe('network')
  })

  it('handles null/undefined gracefully', () => {
    const result = translateContractError(null)

    expect(result.category).toBe('unknown')
    expect(result.title).toBe('Unexpected Error')
  })
})

describe('isContractErrorOfCategory', () => {
  it('identifies auth errors', () => {
    const error = new Error('unauthorized access')
    expect(isContractErrorOfCategory(error, 'auth')).toBe(true)
    expect(isContractErrorOfCategory(error, 'network')).toBe(false)
  })

  it('identifies network errors', () => {
    const error = new Error('ECONNREFUSED')
    expect(isContractErrorOfCategory(error, 'network')).toBe(true)
  })

  it('identifies insufficient errors', () => {
    const error = new Error('insufficient resources')
    expect(isContractErrorOfCategory(error, 'insufficient')).toBe(true)
  })
})

describe('getContractErrorTitle', () => {
  it('returns a short title for known errors', () => {
    const error = new Error('invalid signature')
    const title = getContractErrorTitle(error)

    expect(typeof title).toBe('string')
    expect(title.length).toBeGreaterThan(0)
    expect(title.length).toBeLessThan(100)
  })
})

describe('getContractErrorResolution', () => {
  it('returns resolution steps for known errors', () => {
    const error = new Error('insufficient balance')
    const steps = getContractErrorResolution(error)

    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.every((s) => typeof s === 'string')).toBe(true)
  })
})
