import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MAX_SCAN_HISTORY,
  clearCache,
  getStorageUsage,
  isQuotaExceededError,
  pushLru,
  safeSetItem,
  toTxnRef,
} from '../storage-quota'

function quotaError() {
  return Object.assign(new Error('full'), { name: 'QuotaExceededError' })
}

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('isQuotaExceededError', () => {
  it('recognises browser variants and rejects other values', () => {
    expect(isQuotaExceededError(quotaError())).toBe(true)
    expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true)
    expect(isQuotaExceededError({ code: 22 })).toBe(true)
    expect(isQuotaExceededError(new Error('other'))).toBe(false)
    expect(isQuotaExceededError(null)).toBe(false)
    expect(isQuotaExceededError('QuotaExceededError')).toBe(false)
  })
})

describe('getStorageUsage', () => {
  it('reports zero for empty storage', () => {
    expect(getStorageUsage()).toMatchObject({ usedBytes: 0, ratio: 0, warning: false })
  })

  it('counts keys and values at 2 bytes per character', () => {
    window.localStorage.setItem('ab', 'cdef')
    expect(getStorageUsage().usedBytes).toBe((2 + 4) * 2)
  })

  it('warns at 80% of the quota, not before', () => {
    window.localStorage.setItem('k', 'x'.repeat(79)) // (1 + 79) * 2 = 160 bytes
    expect(getStorageUsage(window.localStorage, 200).warning).toBe(true) // 80%
    expect(getStorageUsage(window.localStorage, 201).warning).toBe(false)
  })
})

describe('safeSetItem', () => {
  it('writes normally', () => {
    expect(safeSetItem('a', '1')).toBe('ok')
    expect(window.localStorage.getItem('a')).toBe('1')
  })

  it('never throws and reports failure when there is no evictor', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError()
    })
    expect(safeSetItem('a', '1')).toBe('failed')
  })

  it('evicts and retries once on a quota error', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    spy.mockImplementationOnce(() => {
      throw quotaError()
    })
    const evict = vi.fn(() => true)
    expect(safeSetItem('a', '1', { evict })).toBe('evicted')
    expect(evict).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('fails when eviction frees nothing or the retry still overflows', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError()
    })
    expect(safeSetItem('a', '1', { evict: () => false })).toBe('failed')
    expect(safeSetItem('a', '1', { evict: () => true })).toBe('failed')
  })

  it('does not evict for non-quota errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const evict = vi.fn(() => true)
    expect(safeSetItem('a', '1', { evict })).toBe('failed')
    expect(evict).not.toHaveBeenCalled()
  })
})

describe('clearCache', () => {
  it('removes only keys with the given prefixes', () => {
    window.localStorage.setItem('cache:a', '1')
    window.localStorage.setItem('scan:b', '2')
    window.localStorage.setItem('theme', 'dark')
    expect(clearCache(['cache:', 'scan:'])).toBe(2)
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(window.localStorage.length).toBe(1)
  })
})

describe('pushLru', () => {
  it('puts the newest entry first', () => {
    expect(pushLru([{ id: 'a' }], { id: 'b' }).map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('moves a re-added entry to the front without duplicating it', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(pushLru(list, { id: 'c' }).map((e) => e.id)).toEqual(['c', 'a', 'b'])
  })

  it('evicts the oldest entries beyond the limit', () => {
    let list: { id: string }[] = []
    for (let i = 0; i < MAX_SCAN_HISTORY + 10; i++) list = pushLru(list, { id: String(i) })
    expect(list).toHaveLength(MAX_SCAN_HISTORY)
    expect(list[0].id).toBe(String(MAX_SCAN_HISTORY + 9))
    expect(list.at(-1)?.id).toBe('10')
  })

  it('does not mutate its input', () => {
    const list = [{ id: 'a' }]
    pushLru(list, { id: 'b' })
    expect(list).toEqual([{ id: 'a' }])
  })
})

describe('toTxnRef', () => {
  it('keeps only the hash of a full transaction object', () => {
    expect(toTxnRef({ hash: 'abc', ...{ envelope_xdr: 'huge' } })).toEqual({ hash: 'abc' })
  })

  it('falls back to id and returns null without either', () => {
    expect(toTxnRef({ id: 'xyz' })).toEqual({ hash: 'xyz' })
    expect(toTxnRef({})).toBeNull()
  })
})
