import { describe, expect, it } from 'vitest'
import {
  isNumber,
  max,
  maxDecimals,
  maxLength,
  min,
  pattern,
  positive,
  required,
  runRules,
  validateValues,
} from '../validation'

describe('validation rules', () => {
  it('required rejects empty and whitespace-only values', () => {
    expect(required()('')).toBeTruthy()
    expect(required()('   ')).toBeTruthy()
    expect(required()('x')).toBeNull()
  })

  it('isNumber accepts numeric strings and ignores empty', () => {
    expect(isNumber()('')).toBeNull()
    expect(isNumber()('12.5')).toBeNull()
    expect(isNumber()('abc')).toBeTruthy()
    expect(isNumber()('NaN')).toBeTruthy()
  })

  it('positive requires a value greater than zero', () => {
    expect(positive()('0')).toBeTruthy()
    expect(positive()('-1')).toBeTruthy()
    expect(positive()('0.01')).toBeNull()
  })

  it('min and max enforce numeric bounds', () => {
    expect(min(10)('9')).toBeTruthy()
    expect(min(10)('10')).toBeNull()
    expect(max(100)('101')).toBeTruthy()
    expect(max(100)('100')).toBeNull()
  })

  it('maxDecimals limits fractional digits', () => {
    expect(maxDecimals(2)('1.234')).toBeTruthy()
    expect(maxDecimals(2)('1.23')).toBeNull()
    expect(maxDecimals(2)('5')).toBeNull()
  })

  it('maxLength and pattern validate strings', () => {
    expect(maxLength(3)('abcd')).toBeTruthy()
    expect(maxLength(3)('abc')).toBeNull()
    expect(pattern(/^G[A-Z0-9]+$/)('gABC')).toBeTruthy()
    expect(pattern(/^G[A-Z0-9]+$/)('GABC123')).toBeNull()
  })
})

describe('runRules', () => {
  it('returns the first failing rule message', () => {
    const rules = [required('need it'), isNumber('not a number'), positive('too small')]
    expect(runRules('', rules)).toBe('need it')
    expect(runRules('abc', rules)).toBe('not a number')
    expect(runRules('0', rules)).toBe('too small')
    expect(runRules('5', rules)).toBeNull()
  })
})

describe('validateValues', () => {
  it('collects one error per invalid field', () => {
    const errors = validateValues(
      { price: '', amount: '-1' },
      {
        price: [required('Enter a price')],
        amount: [isNumber(), positive('Amount must be positive')],
      }
    )
    expect(errors).toEqual({ price: 'Enter a price', amount: 'Amount must be positive' })
  })

  it('returns an empty object when everything is valid', () => {
    const errors = validateValues(
      { price: '1.5', amount: '10' },
      { price: [required(), isNumber()], amount: [required(), positive()] }
    )
    expect(errors).toEqual({})
  })
})
