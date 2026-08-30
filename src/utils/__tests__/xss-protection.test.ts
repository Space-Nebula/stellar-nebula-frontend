/**
 * Tests for XSS protection utilities
 * Issue #261
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeHTML,
  escapeHTML,
  sanitizeURL,
  sanitizeContractString,
  sanitizeUserInput,
} from '../xss-protection'

describe('XSS Protection', () => {
  describe('sanitizeHTML', () => {
    it('should escape HTML tags', () => {
      const input = '<script>alert("XSS")</script>'
      const result = sanitizeHTML(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('should handle empty strings', () => {
      expect(sanitizeHTML('')).toBe('')
    })
  })

  describe('escapeHTML', () => {
    it('should escape special characters', () => {
      const input = '<div>"test" & \'quote\'</div>'
      const result = escapeHTML(input)
      expect(result).toBe('&lt;div&gt;&quot;test&quot; &amp; &#x27;quote&#x27;&lt;&#x2F;div&gt;')
    })
  })

  describe('sanitizeURL', () => {
    it('should block javascript: URLs', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('')
    })

    it('should block data: URLs', () => {
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('')
    })

    it('should allow https URLs', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com')
    })

    it('should allow relative URLs', () => {
      expect(sanitizeURL('/path/to/page')).toBe('/path/to/page')
    })
  })

  describe('sanitizeContractString', () => {
    it('should escape contract-returned strings', () => {
      const malicious = '<img src=x onerror=alert(1)>'
      const result = sanitizeContractString(malicious)
      expect(result).not.toContain('<img')
    })

    it('should handle non-string inputs', () => {
      expect(sanitizeContractString(123)).toBe('123')
      expect(sanitizeContractString(null)).toBe('null')
    })
  })

  describe('sanitizeUserInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert(1)</script> World'
      const result = sanitizeUserInput(input)
      expect(result).not.toContain('<script>')
    })

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>'
      const result = sanitizeUserInput(input)
      expect(result).not.toContain('onclick')
    })
  })
})
