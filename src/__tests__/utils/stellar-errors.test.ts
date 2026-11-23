import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseStellarError,
  extractErrorCode,
  STELLAR_ERROR_MAP,
} from '@/utils/stellar-errors'
import { captureError } from '@/services/errorTracking'

vi.mock('@/services/errorTracking', () => ({
  captureError: vi.fn(),
}))

describe('Stellar Error Mapping & Humanization (Issue #547)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Code Extraction', () => {
    it('extracts error code from raw string', () => {
      expect(extractErrorCode('Transaction failed with tx_bad_seq')).toBe('tx_bad_seq')
      expect(extractErrorCode('Error: op_underfunded')).toBe('op_underfunded')
      expect(extractErrorCode('Request timeout after 30000ms')).toBe('timeout')
    })

    it('extracts error code from nested Horizon response object', () => {
      const horizonError = {
        response: {
          data: {
            extras: {
              result_codes: {
                transaction: 'tx_bad_seq',
                operations: ['op_underfunded'],
              },
            },
          },
        },
      }
      expect(extractErrorCode(horizonError)).toBe('tx_bad_seq')
    })

    it('extracts operation error code if transaction code is not in map', () => {
      const horizonOpError = {
        response: {
          data: {
            extras: {
              result_codes: {
                transaction: 'tx_failed',
                operations: ['op_underfunded'],
              },
            },
          },
        },
      }
      expect(extractErrorCode(horizonOpError)).toBe('op_underfunded')
    })
  })

  describe('Friendly Error Parsing and Acceptance Criteria', () => {
    it('maps tx_bad_seq to user-friendly message with recovery action', () => {
      const parsed = parseStellarError('tx_bad_seq')

      expect(parsed.code).toBe('tx_bad_seq')
      expect(parsed.type).toBe('bad_seq')
      expect(parsed.title).toBe('Account Sequence Out of Sync')
      expect(parsed.message).not.toContain('tx_bad_seq')
      expect(parsed.message).toBe(
        'The transaction sequence number does not match your current account state on the Stellar network.'
      )
      expect(parsed.recoveryStep).toContain('Refresh your wallet connection')
      expect(parsed.learnMoreUrl).toContain('/docs/COMMON_ERRORS.md#error-tx_bad_seq')
    })

    it('maps op_underfunded to friendly insufficient balance message with recovery steps', () => {
      const parsed = parseStellarError('op_underfunded')

      expect(parsed.code).toBe('op_underfunded')
      expect(parsed.type).toBe('insufficient_funds')
      expect(parsed.title).toBe('Insufficient Balance')
      expect(parsed.message).not.toContain('op_underfunded')
      expect(parsed.recoveryStep).toContain('Add more XLM to your wallet')
      expect(parsed.learnMoreUrl).toContain('/docs/COMMON_ERRORS.md#error-op_underfunded')
    })

    it('includes estimated fee in insufficient balance message when provided', () => {
      const parsed = parseStellarError('op_underfunded', {
        estimatedFeeXlm: '0.0000400 XLM',
      })

      expect(parsed.message).toContain('0.0000400 XLM')
      expect(parsed.message).toBe(
        'Your wallet balance is too low for the required transaction fee (estimated fee: 0.0000400 XLM).'
      )
    })

    it('maps timeout error to friendly connection message', () => {
      const parsed = parseStellarError('network timeout exceeded')

      expect(parsed.code).toBe('timeout')
      expect(parsed.type).toBe('timeout')
      expect(parsed.title).toBe('Network Request Timed Out')
      expect(parsed.recoveryStep).toContain('Check your internet connection')
      expect(parsed.learnMoreUrl).toContain('/docs/COMMON_ERRORS.md')
    })

    it('maps network errors to friendly connection message', () => {
      const parsed = parseStellarError('Failed to fetch from horizon node')

      expect(parsed.code).toBe('network_error')
      expect(parsed.type).toBe('network')
      expect(parsed.title).toBe('Stellar Network Error')
      expect(parsed.recoveryStep).toContain('Check your internet connection')
    })

    it('ensures NO raw error codes are displayed to users in primary message', () => {
      const commonCodes = ['tx_bad_seq', 'op_underfunded', 'tx_insufficient_fee', 'tx_too_late', 'tx_bad_auth']

      for (const code of commonCodes) {
        const parsed = parseStellarError(code)
        expect(parsed.message.toLowerCase()).not.toContain(code.toLowerCase())
        expect(parsed.recoveryStep.length).toBeGreaterThan(10)
        expect(parsed.learnMoreUrl).toContain('/docs/COMMON_ERRORS.md')
      }
    })

    it('logs structured context tags to Sentry for monitoring', () => {
      const error = new Error('tx_bad_seq')
      parseStellarError(error, { logToSentry: true })

      expect(captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            stellar_error_code: 'tx_bad_seq',
            stellar_error_type: 'bad_seq',
          },
          stellar_error_code: 'tx_bad_seq',
          stellar_error_type: 'bad_seq',
          learn_more_url: expect.stringContaining('#error-tx_bad_seq'),
        })
      )
    })
  })
})
