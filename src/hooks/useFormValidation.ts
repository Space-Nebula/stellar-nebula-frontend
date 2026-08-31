import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FocusEvent } from 'react'
import { runRules, validateValues } from '../utils/validation'
import type { ValidationSchema } from '../utils/validation'

export interface UseFormValidationOptions {
  /** Re-validate a field on every keystroke, not just after it has been touched. */
  validateOnChange?: boolean
}

export interface UseFormValidationReturn<Values extends Record<string, string>> {
  values: Values
  errors: Partial<Record<keyof Values, string>>
  touched: Partial<Record<keyof Values, boolean>>
  /** Whether the form currently has no known errors. */
  isValid: boolean
  /** `onChange` handler factory for an input. */
  handleChange: (name: keyof Values) => (event: ChangeEvent<HTMLInputElement>) => void
  /** `onBlur` handler factory for an input. */
  handleBlur: (name: keyof Values) => (event?: FocusEvent<HTMLInputElement>) => void
  /** Imperatively set a field value (e.g. a "MAX" button). */
  setValue: (name: keyof Values, value: string) => void
  /** Validate every field, mark all touched, and return whether the form is valid. */
  validateAll: () => boolean
  /** Reset values, errors and touched state. */
  reset: (nextValues?: Values) => void
}

/**
 * Headless form-validation hook: real-time per-field feedback, touched tracking,
 * and a `validateAll` for submit. Pair the returned `errors` with
 * `aria-invalid` / `aria-describedby` and a `role="alert"` message element for
 * accessible error announcements.
 *
 * Fields are validated as their value changes once they have been touched
 * (blurred), or immediately when `validateOnChange` is set.
 *
 * `schema` may be passed inline; memoise it only if its rules depend on props.
 */
export function useFormValidation<Values extends Record<string, string>>(
  initialValues: Values,
  schema: ValidationSchema<Values>,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<Values> {
  const { validateOnChange = false } = options

  const [values, setValues] = useState<Values>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({})

  // Latest schema, read only from effects / event-time callbacks.
  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  })

  // Keep visible errors in sync with values for fields the user has engaged.
  useEffect(() => {
    setErrors((prev) => {
      const next: Partial<Record<keyof Values, string>> = { ...prev }
      let changed = false
      for (const key of Object.keys(schemaRef.current) as Array<keyof Values>) {
        if (!validateOnChange && !touched[key]) continue
        const error = runRules(values[key], schemaRef.current[key], values)
        if (error && next[key] !== error) {
          next[key] = error
          changed = true
        } else if (!error && key in next) {
          delete next[key]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [values, touched, validateOnChange])

  const handleChange = useCallback(
    (name: keyof Values) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setValues((prev) => ({ ...prev, [name]: value }))
    },
    []
  )

  const handleBlur = useCallback(
    (name: keyof Values) => () => {
      setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }))
    },
    []
  )

  const setValue = useCallback((name: keyof Values, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }))
  }, [])

  const validateAll = useCallback((): boolean => {
    const nextErrors = validateValues(values, schemaRef.current)
    setErrors(nextErrors)
    setTouched(
      Object.keys(schemaRef.current).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof Values, boolean>>
      )
    )
    return Object.keys(nextErrors).length === 0
  }, [values])

  const reset = useCallback(
    (nextValues: Values = initialValues) => {
      setValues(nextValues)
      setErrors({})
      setTouched({})
    },
    [initialValues]
  )

  const isValid = useMemo(() => Object.values(errors).every((error) => !error), [errors])

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    setValue,
    validateAll,
    reset,
  }
}
