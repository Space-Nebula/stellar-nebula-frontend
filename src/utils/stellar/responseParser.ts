import { scValToNative, xdr } from '@stellar/stellar-sdk'

export type ContractNativePrimitive = string | number | boolean | null
export type ContractNativeValue =
  | ContractNativePrimitive
  | ContractNativeValue[]
  | { [key: string]: ContractNativeValue }

export interface ParsedContractResponse<T = ContractNativeValue> {
  value: T
  xdr: string
  raw: unknown
}

export interface ParsedSimulationResult<T = ContractNativeValue> {
  status: 'success' | 'error'
  value: T | null
  latestLedger: number
  minResourceFee: string | null
  auth: string[]
  events: string[]
  transactionData: string | null
  restorePreamble: {
    minResourceFee: string
    transactionData: string
  } | null
  error: string | null
  raw: unknown
}

export class ContractResponseParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractResponseParseError'
  }
}

function normalizeNativeValue(value: unknown): ContractNativeValue {
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.map(normalizeNativeValue)
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView
    return Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  }
  if (value instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(value))
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [key, normalizeNativeValue(entry)])
    )
  }

  return String(value)
}

function parseScVal(valueXdr: string): ContractNativeValue {
  if (!valueXdr.trim()) {
    throw new ContractResponseParseError('Empty contract response XDR payload.')
  }

  try {
    const parsed = xdr.ScVal.fromXDR(valueXdr, 'base64')
    return normalizeNativeValue(scValToNative(parsed))
  } catch (error) {
    throw new ContractResponseParseError(
      error instanceof Error ? error.message : 'Unable to parse contract response XDR.'
    )
  }
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => (typeof entry === 'string' ? [entry] : []))
}

function readSimulationValue(payload: Record<string, unknown>): string | null {
  const direct = payload.xdr
  if (typeof direct === 'string') return direct

  const results = payload.results
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0] as Record<string, unknown>
    if (typeof first.xdr === 'string') return first.xdr
  }

  return null
}

export function parseContractResponseXdr<T = ContractNativeValue>(
  valueXdr: string
): ParsedContractResponse<T> {
  return {
    value: parseScVal(valueXdr) as T,
    xdr: valueXdr,
    raw: valueXdr,
  }
}

export function parseSimulationResponse<T = ContractNativeValue>(
  payload: unknown
): ParsedSimulationResult<T> {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const responseXdr = readSimulationValue(record)
  const value = responseXdr ? (parseScVal(responseXdr) as T) : null
  const restorePreamble = record.restorePreamble

  return {
    status: typeof record.error === 'string' ? 'error' : 'success',
    value,
    latestLedger:
      typeof record.latestLedger === 'number'
        ? record.latestLedger
        : typeof record.latest_ledger === 'number'
          ? record.latest_ledger
          : 0,
    minResourceFee:
      typeof record.minResourceFee === 'string'
        ? record.minResourceFee
        : typeof record.min_resource_fee === 'string'
          ? record.min_resource_fee
          : null,
    auth: readStringArray(record.auth),
    events: readStringArray(record.events),
    transactionData:
      typeof record.transactionData === 'string'
        ? record.transactionData
        : typeof record.transaction_data === 'string'
          ? record.transaction_data
          : null,
    restorePreamble:
      restorePreamble && typeof restorePreamble === 'object'
        ? {
            minResourceFee:
              typeof (restorePreamble as Record<string, unknown>).minResourceFee === 'string'
                ? ((restorePreamble as Record<string, unknown>).minResourceFee as string)
                : typeof (restorePreamble as Record<string, unknown>).min_resource_fee === 'string'
                  ? ((restorePreamble as Record<string, unknown>).min_resource_fee as string)
                  : '',
            transactionData:
              typeof (restorePreamble as Record<string, unknown>).transactionData === 'string'
                ? ((restorePreamble as Record<string, unknown>).transactionData as string)
                : typeof (restorePreamble as Record<string, unknown>).transaction_data === 'string'
                  ? ((restorePreamble as Record<string, unknown>).transaction_data as string)
                  : '',
          }
        : null,
    error:
      typeof record.error === 'string'
        ? record.error
        : typeof record.details === 'string'
          ? record.details
          : null,
    raw: payload,
  }
}

export function parseResponseValue<T = ContractNativeValue>(payload: unknown): T {
  if (typeof payload === 'string') {
    return parseScVal(payload) as T
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>

    if (typeof record.xdr === 'string') {
      return parseScVal(record.xdr) as T
    }

    if (typeof record.value === 'string') {
      return parseScVal(record.value) as T
    }
  }

  throw new ContractResponseParseError('Unsupported contract response payload.')
}
