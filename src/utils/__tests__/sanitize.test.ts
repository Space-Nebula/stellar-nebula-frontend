import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  stripHtmlTags,
  containsScriptInjection,
  sanitizeText,
  sanitizeUrl,
} from '../sanitize'

describe('escapeHtml', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">&'/`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&#x2F;')
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Nebula Nomad')).toBe('Nebula Nomad')
  })
})

describe('stripHtmlTags', () => {
  it('removes a script tag and its closing tag', () => {
    expect(stripHtmlTags('<script>alert(1)</script>hello')).toBe('alert(1)hello')
  })

  it('removes a self-closing tag with attributes', () => {
    expect(stripHtmlTags('<img src=x onerror=alert(1) />caption')).toBe('caption')
  })

  it('leaves text with no tags untouched', () => {
    expect(stripHtmlTags('plain text')).toBe('plain text')
  })
})

describe('containsScriptInjection', () => {
  it('detects an HTML tag', () => {
    expect(containsScriptInjection('<img src=x>')).toBe(true)
  })

  it('detects an inline event handler', () => {
    expect(containsScriptInjection('onmouseover=alert(1)')).toBe(true)
  })

  it('detects a javascript: URI', () => {
    expect(containsScriptInjection('javascript:alert(1)')).toBe(true)
  })

  it('is false for safe plain text', () => {
    expect(containsScriptInjection('My Ship Name')).toBe(false)
  })

  it('does not miss a match across repeated calls (no stateful lastIndex)', () => {
    expect(containsScriptInjection('<b>one</b>')).toBe(true)
    expect(containsScriptInjection('<b>two</b>')).toBe(true)
    expect(containsScriptInjection('<b>three</b>')).toBe(true)
  })
})

describe('sanitizeText', () => {
  it('strips tags and escapes the remaining text', () => {
    expect(sanitizeText('<script>alert(1)</script>Hello & welcome')).toBe(
      'alert(1)Hello &amp; welcome'
    )
  })

  it('removes control characters but keeps newlines', () => {
    expect(sanitizeText('a\u0000b\nc')).toBe('ab\nc')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  padded  ')).toBe('padded')
  })

  it('enforces maxLength', () => {
    expect(sanitizeText('abcdef', { maxLength: 3 })).toBe('abc')
  })

  it('collapses internal whitespace when requested', () => {
    expect(sanitizeText('a   b\n\nc', { collapseWhitespace: true })).toBe('a b c')
  })

  it('returns an empty string for non-string input', () => {
    // @ts-expect-error -- exercising the runtime guard for non-string callers
    expect(sanitizeText(null)).toBe('')
  })
})

describe('sanitizeUrl', () => {
  it('allows a safe https URL', () => {
    expect(sanitizeUrl('https://stellar.org')).toBe('https://stellar.org')
  })

  it('allows a relative path', () => {
    expect(sanitizeUrl('/dashboard')).toBe('/dashboard')
  })

  it('blocks a javascript: URI', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
  })

  it('blocks a data: URI', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
  })
})
