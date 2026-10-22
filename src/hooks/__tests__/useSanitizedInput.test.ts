import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSanitizedInput } from '../useSanitizedInput'

function change(value: string) {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>
}

describe('useSanitizedInput', () => {
  it('sanitizes the initial value', () => {
    const { result } = renderHook(() => useSanitizedInput('<script>x</script>hi'))
    expect(result.current.value).toBe('xhi')
  })

  it('sanitizes every onChange', () => {
    const { result } = renderHook(() => useSanitizedInput(''))

    act(() => {
      result.current.onChange(change('<img src=x onerror=alert(1)>Nebula'))
    })

    expect(result.current.value).toBe('Nebula')
  })

  it('enforces maxLength from options', () => {
    const { result } = renderHook(() => useSanitizedInput('', { maxLength: 4 }))

    act(() => {
      result.current.onChange(change('abcdefgh'))
    })

    expect(result.current.value).toBe('abcd')
  })

  it('setValue also sanitizes', () => {
    const { result } = renderHook(() => useSanitizedInput(''))

    act(() => {
      result.current.setValue('<b>bold</b>')
    })

    expect(result.current.value).toBe('bold')
  })
})
