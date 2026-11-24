import { captureError } from '../services/errorTracking'

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

export const MIN_STELLAR_TRADE_AMOUNT = 0.0000001
export const STELLAR_MAX_DECIMALS = 7

/**
 * Normalizes an amount string, correctly expanding scientific notation (e.g. "1e-5" -> "0.00001")
 * so decimal places and precision limits can be verified accurately without precision loss (#552).
 */
export function normalizeAmountString(value: string | number | unknown): string {
  if (value == null) return ''
  const str = String(value).trim()
  if (!str) return ''

  if (/[eE]/.test(str)) {
    const num = Number(str)
    if (!Number.isFinite(num)) return str
    return num.toLocaleString('en-US', {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: 20,
    })
  }

  return str
}

/** Value must parse to a finite number. Supports scientific notation (e.g. 1e-5) (#552). */
export const isNumber =
  (message = 'Enter a valid number'): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const normalized = normalizeAmountString(value)
    return Number.isFinite(Number(normalized)) ? null : message
  }

/** Numeric value must be strictly greater than zero. */
export const positive =
  (message = 'Enter an amount greater than zero'): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const num = Number(normalizeAmountString(value))
    return Number.isFinite(num) && num > 0 ? null : message
  }

/** Numeric value must be >= `minValue`. */
export const min =
  (minValue: number, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const num = Number(normalizeAmountString(value))
    return Number.isFinite(num) && num >= minValue ? null : (message ?? `Must be at least ${minValue}`)
  }

/** Minimum trade amount rule on Stellar DEX (default: 0.0000001 XLM / 1 stroop) (#552). */
export const minAmount =
  (minValue: number = MIN_STELLAR_TRADE_AMOUNT, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const num = Number(normalizeAmountString(value))
    if (!Number.isFinite(num)) return 'Enter a valid number'
    return num >= minValue ? null : (message ?? `Minimum trade amount is ${minValue}`)
  }

/** Numeric value must be <= `maxValue`. */
export const max =
  (maxValue: number, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const num = Number(normalizeAmountString(value))
    return Number.isFinite(num) && num <= maxValue ? null : (message ?? `Must be ${maxValue} or less`)
  }

/** Value must have no more than `places` decimal places. Correctly handles scientific notation (#552). */
export const maxDecimals =
  (places: number = STELLAR_MAX_DECIMALS, message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const normalized = normalizeAmountString(value)
    const [, decimals = ''] = normalized.split('.')
    return decimals.length <= places
      ? null
      : (message ?? `Use at most ${places} decimal place${places === 1 ? '' : 's'}`)
  }

/** Validates that amount does not exceed available balance (#552). */
export const balanceLimit =
  (availableBalance: number, assetCode = 'XLM', message?: string): ValidationRule<string> =>
  (value) => {
    if (isEmpty(value)) return null
    const num = Number(normalizeAmountString(value))
    if (!Number.isFinite(num)) return null
    return num <= availableBalance
      ? null
      : (message ?? `Amount cannot exceed your balance of ${availableBalance} ${assetCode}`)
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

// ─── Runtime prop validation ──────────────────────────────────────────────
// Guards for values that arrive from outside the type system (API responses,
// persisted state). Types alone cannot catch these at runtime.

/** Returns true when a value has the expected shape. */
export type PropGuard = (value: unknown) => boolean

export const isString = (value: unknown): value is string => typeof value === 'string'

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Allow `undefined` in addition to the guarded type. */
export const optionalProp =
  (guard: PropGuard): PropGuard =>
  (value) =>
    value === undefined || guard(value)

/** Every item in an array must pass `guard`. */
export const arrayOf =
  (guard: PropGuard): PropGuard =>
  (value) =>
    Array.isArray(value) && value.every((item) => guard(item))

/** Names of the props in `schema` whose values fail their guard. */
export function findInvalidProps(
  props: Record<string, unknown>,
  schema: Record<string, PropGuard>
): string[] {
  return Object.keys(schema).filter((key) => !schema[key](props[key]))
}

/**
 * Report invalid props. In development they are logged as warnings so the
 * problem is visible while coding. In production they go to error tracking.
 */
export function reportInvalidProps(component: string, invalid: string[]): void {
  if (invalid.length === 0) return
  const message = `${component}: invalid prop(s): ${invalid.join(', ')}`
  if (import.meta.env.DEV) {
    console.warn(message)
  } else {
    captureError(new Error(message), { component, invalid })
  }
}
