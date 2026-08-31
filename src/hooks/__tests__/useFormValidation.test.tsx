import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFormValidation } from '../useFormValidation'
import { isNumber, positive, required } from '../../utils/validation'

const schema = {
  price: [required('Enter a price'), isNumber('Not a number'), positive('Must be positive')],
  amount: [required('Enter an amount'), positive('Must be positive')],
}

function setup(initial = { price: '', amount: '' }) {
  return renderHook(() => useFormValidation(initial, schema))
}

describe('useFormValidation', () => {
  it('starts with no errors and validates all fields on demand', () => {
    const { result } = setup()
    expect(result.current.errors).toEqual({})

    let valid = true
    act(() => {
      valid = result.current.validateAll()
    })

    expect(valid).toBe(false)
    expect(result.current.errors.price).toBe('Enter a price')
    expect(result.current.errors.amount).toBe('Enter an amount')
    expect(result.current.touched).toEqual({ price: true, amount: true })
  })

  it('does not surface an error until the field is touched (blurred)', () => {
    const { result } = setup()

    act(() => {
      result.current.handleChange('price')({
        target: { value: 'abc' },
      } as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.errors.price).toBeUndefined()

    act(() => {
      result.current.handleBlur('price')()
    })
    expect(result.current.errors.price).toBe('Not a number')
  })

  it('re-validates on change once a field has been touched', () => {
    const { result } = setup()

    act(() => result.current.handleBlur('price')())
    expect(result.current.errors.price).toBe('Enter a price')

    act(() => {
      result.current.handleChange('price')({
        target: { value: '1.5' },
      } as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.errors.price).toBeUndefined()
  })

  it('setValue marks the field touched and validates', () => {
    const { result } = setup()

    act(() => result.current.setValue('amount', '25'))
    expect(result.current.values.amount).toBe('25')
    expect(result.current.touched.amount).toBe(true)
    expect(result.current.errors.amount).toBeUndefined()
  })

  it('reports isValid and passes validateAll when values are good', () => {
    const { result } = setup({ price: '2', amount: '10' })

    let valid = false
    act(() => {
      valid = result.current.validateAll()
    })
    expect(valid).toBe(true)
    expect(result.current.isValid).toBe(true)
  })

  it('reset clears errors, touched and restores values', () => {
    const { result } = setup()

    act(() => result.current.validateAll())
    expect(Object.keys(result.current.errors)).toHaveLength(2)

    act(() => result.current.reset())
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
  })
})
