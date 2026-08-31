/**
 * Small, dependency-free client-side validation helpers.
 *
 * A `ValidationRule` returns `null` when the value is acceptable, or a
 * human-readable error message when it is not. Rules receive the whole set of
 * form values as context so cross-field checks are possible.
 */
export type ValidationRule<T = string> = (
  value: T,
  context?: Record<string, unknown>
) => string | null

const isEmpty = (value: unknown): boolean =>
  value == null || (typeof value === 'string' && value.trim() === '')

/** Value must be present (non-empty after trimming). */
export const required =
  (message = 'This field is required'): ValidationRule<string> =>
  (value) =>
    isEmpty(value) ? message : null

/** Value must parse to a finite number. Empty values pass (combine with `required`). */
export const isNumber =
  (message = 'Enter a valid number'): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    return Number.isFinite(Number(value)) ? null : message
  }

/** Numeric value must be strictly greater than zero. */
export const positive =
  (message = 'Enter an amount greater than zero'): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    return Number(value) > 0 ? null : message
  }

/** Numeric value must be >= `minValue`. */
export const min =
  (minValue: number, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    return Number(value) >= minValue ? null : (message ?? `Must be at least ${minValue}`)
  }

/** Numeric value must be <= `maxValue`. */
export const max =
  (maxValue: number, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    return Number(value) <= maxValue ? null : (message ?? `Must be ${maxValue} or less`)
  }

/** Value must have no more than `places` decimal places. */
export const maxDecimals =
  (places: number, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const [, decimals = ''] = String(value).split('.')
    return decimals.length <= places
      ? null
      : (message ?? `Use at most ${places} decimal place${places === 1 ? '' : 's'}`)
  }

/** String length must be <= `length`. */
export const maxLength =
  (length: number, message?: string): ValidationRule<string> =>
  (value) =>
    !value || value.length <= length ? null : (message ?? `Use at most ${length} characters`)

/** Value must match `pattern`. Empty values pass. */
export const pattern =
  (regex: RegExp, message = 'Invalid format'): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    return regex.test(value) ? null : message
  }

/**
 * Run rules in order and return the first error message, or `null` if every
 * rule passes.
 */
export function runRules<T>(
  value: T,
  rules: ValidationRule<T>[] = [],
  context?: Record<string, unknown>
): string | null {
  for (const rule of rules) {
    const error = rule(value, context)
    if (error) return error
  }
  return null
}

export type ValidationSchema<Values> = {
  [K in keyof Values]?: ValidationRule<string>[]
}

/** Validate every field in `schema`, returning a map of field -> error message. */
export function validateValues<Values extends Record<string, string>>(
  values: Values,
  schema: ValidationSchema<Values>
): Partial<Record<keyof Values, string>> {
  const errors: Partial<Record<keyof Values, string>> = {}
  for (const key of Object.keys(schema) as Array<keyof Values>) {
    const error = runRules(values[key], schema[key], values)
    if (error) errors[key] = error
  }
  return errors
}
