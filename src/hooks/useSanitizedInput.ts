import { useState, useCallback, type ChangeEvent } from 'react'
import { sanitizeText, type SanitizeTextOptions } from '@/utils/sanitize'

export interface UseSanitizedInputResult {
  /** Sanitized value — always safe to store, export, or render. */
  value: string
  /** Pass directly to an `<input>` / `<textarea>` `onChange`. */
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Replaces the value directly (also sanitized), e.g. on reset. */
  setValue: (next: string) => void
}

/**
 * Controlled free-text input state that sanitizes every value on change
 * (issue #491), so a pasted or typed name/address/signature can never carry
 * an HTML tag, an inline event handler, or control characters into state.
 *
 * @example
 * const signer = useSanitizedInput('', { maxLength: 128 })
 * <input value={signer.value} onChange={signer.onChange} />
 */
export function useSanitizedInput(
  initialValue = '',
  options: SanitizeTextOptions = {}
): UseSanitizedInputResult {
  const [value, setValue] = useState(() => sanitizeText(initialValue, options))

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(sanitizeText(event.target.value, options))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `options` is passed inline by callers in practice
    [options.maxLength, options.collapseWhitespace]
  )

  const setSanitizedValue = useCallback(
    (next: string) => setValue(sanitizeText(next, options)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.maxLength, options.collapseWhitespace]
  )

  return { value, onChange, setValue: setSanitizedValue }
}
