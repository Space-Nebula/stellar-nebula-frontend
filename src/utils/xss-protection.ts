/**
 * XSS Protection utilities for sanitizing user-generated content
 * and contract-returned strings before rendering.
 *
 * Issue #261: Add XSS protection for user content
 */

/**
 * Simple HTML sanitizer that removes potentially dangerous HTML tags and attributes.
 * For production use, consider using DOMPurify library for more robust protection.
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''

  // Create a temporary div to parse HTML
  const temp = document.createElement('div')
  temp.textContent = html // This escapes all HTML
  return temp.innerHTML
}

/**
 * Escapes special HTML characters to prevent XSS attacks.
 * Use this for rendering user input or contract data as text.
 */
export function escapeHTML(text: string): string {
  if (!text) return ''

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char)
}

/**
 * Sanitizes URLs to prevent javascript: and data: URL attacks.
 * Only allows http:, https:, and relative URLs.
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''

  const trimmedUrl = url.trim().toLowerCase()

  // Block dangerous protocols
  if (
    trimmedUrl.startsWith('javascript:') ||
    trimmedUrl.startsWith('data:') ||
    trimmedUrl.startsWith('vbscript:')
  ) {
    return ''
  }

  // Allow http, https, and relative URLs
  if (
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('#')
  ) {
    return url
  }

  // Default to relative URL
  return '/' + url
}

/**
 * Sanitizes contract-returned strings before rendering.
 * Stellar smart contracts can return arbitrary strings that might contain malicious content.
 */
export function sanitizeContractString(contractData: unknown): string {
  if (typeof contractData !== 'string') {
    return String(contractData)
  }

  return escapeHTML(contractData)
}

/**
 * Sanitizes user input before storing or rendering.
 * Removes script tags, event handlers, and dangerous attributes.
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return ''

  let sanitized = input

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Escape remaining HTML
  return escapeHTML(sanitized)
}

/**
 * Content Security Policy meta tag generator.
 * Add this to your HTML head for additional XSS protection.
 */
export function generateCSPMetaTag(): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.logrocket.io https://horizon-futurenet.stellar.org",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://horizon-futurenet.stellar.org https://*.stellar.org wss://*.stellar.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`
}
