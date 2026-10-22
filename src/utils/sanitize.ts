/**
 * Input sanitization for free-text fields the user types or pastes
 * (signer addresses/signatures, imported XDR, and any future
 * name/description field) before it is stored, rendered, or exported.
 *
 * Issue #491: user-supplied text must never be able to inject HTML, run a
 * script, or carry control characters into the app's state, exports, or UI.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
}

const HTML_ENTITY_PATTERN = /[&<>"'/]/g

// Matches a full HTML/XML tag, e.g. `<script>`, `</div>`, `<img onerror=...>`.
// Two copies (global for replace, non-global for test) so a `g` regex's
// stateful `lastIndex` can never make `containsScriptInjection` miss a match.
const HTML_TAG_PATTERN = /<\/?[a-zA-Z][^>]*>/g
const HTML_TAG_TEST_PATTERN = /<\/?[a-zA-Z][^>]*>/

// `javascript:`, `vbscript:`, and `data:text/html` URIs can execute script
// when assigned to an href/src; any other scheme (http(s), mailto, relative) is safe.
const UNSAFE_URL_SCHEME_PATTERN = /^\s*(javascript|vbscript|data):/i

// C0/C1 control characters except tab (\t), newline (\n), and carriage return (\r).
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** HTML-escapes the characters that let text break out of an element or attribute. */
export function escapeHtml(input: string): string {
  return input.replace(HTML_ENTITY_PATTERN, (char) => HTML_ENTITIES[char])
}

/** Removes any `<tag>` / `</tag>` substrings, including malformed/incomplete ones. */
export function stripHtmlTags(input: string): string {
  return input.replace(HTML_TAG_PATTERN, '')
}

/** True when the string contains an HTML tag, an inline event handler, or a script-executing scheme. */
export function containsScriptInjection(input: string): boolean {
  return (
    HTML_TAG_TEST_PATTERN.test(input) ||
    /\bon[a-z]+\s*=/i.test(input) ||
    UNSAFE_URL_SCHEME_PATTERN.test(input)
  )
}

export interface SanitizeTextOptions {
  /** Truncates the result to this many characters. */
  maxLength?: number
  /** Collapses internal runs of whitespace to a single space (default: false). */
  collapseWhitespace?: boolean
}

/**
 * Sanitizes a plain-text input: strips control characters and HTML tags,
 * HTML-escapes the rest, trims, and optionally enforces a max length.
 *
 * Use this for any free-text field (names, descriptions, pasted addresses
 * or signatures) before it is stored or rendered.
 */
export function sanitizeText(input: string, options: SanitizeTextOptions = {}): string {
  if (typeof input !== 'string') return ''

  let result = input.replace(CONTROL_CHAR_PATTERN, '')
  result = stripHtmlTags(result)
  result = escapeHtml(result)
  result = result.trim()

  if (options.collapseWhitespace) {
    result = result.replace(/\s+/g, ' ')
  }

  if (typeof options.maxLength === 'number' && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength)
  }

  return result
}

/** Returns the URL unchanged if it uses a safe scheme, otherwise `''`. */
export function sanitizeUrl(input: string): string {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  return UNSAFE_URL_SCHEME_PATTERN.test(trimmed) ? '' : trimmed
}
