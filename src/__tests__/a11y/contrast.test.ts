import { describe, it, expect } from 'vitest'
import { checkContrast, parseHex, contrastRatio } from '@/utils/contrast-checker'

describe('WCAG 2.1 AA Color Contrast Requirements (Issue #549)', () => {
  // Dark mode surface backgrounds
  const darkSurface = parseHex('#1F2937')! // Tailwind gray-800
  const spaceVoid = parseHex('#050716')!   // space-950
  const darkCard = parseHex('#111827')!    // Tailwind gray-900
  const midDark = parseHex('#374151')!     // Tailwind gray-700

  describe('Secondary Text Contrast', () => {
    it('verifies old secondary text (#6B7280) failed WCAG AA (< 4.5:1)', () => {
      const oldSecondary = parseHex('#6B7280')!
      const result = checkContrast(oldSecondary, darkSurface)
      expect(result.passesAA).toBe(false)
      expect(result.ratio).toBeLessThan(4.5)
      expect(result.ratio).toBeCloseTo(3.04, 1)
    })

    it('verifies updated secondary text (#9CA3AF) passes WCAG AA on dark surface', () => {
      const accessibleSecondary = parseHex('#9CA3AF')! // gray-400
      const result = checkContrast(accessibleSecondary, darkSurface)
      expect(result.passesAA).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.ratio).toBeCloseTo(5.78, 1)
    })

    it('verifies updated secondary text (#9CA3AF) passes WCAG AAA on space-950', () => {
      const accessibleSecondary = parseHex('#9CA3AF')!
      const result = checkContrast(accessibleSecondary, spaceVoid)
      expect(result.passesAA).toBe(true)
      expect(result.passesAAANormal).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(7.0)
    })

    it('verifies muted text (#D1D5DB) passes WCAG AAA on dark surface', () => {
      const mutedText = parseHex('#D1D5DB')! // gray-300
      const result = checkContrast(mutedText, darkSurface)
      expect(result.passesAA).toBe(true)
      expect(result.passesAAANormal).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(7.0)
      expect(result.ratio).toBeCloseTo(9.96, 1)
    })
  })

  describe('Link Color Contrast', () => {
    it('verifies old link color (#60A5FA) on mid-dark (#374151) failed WCAG AA (< 4.5:1)', () => {
      const oldLink = parseHex('#60A5FA')!
      const result = checkContrast(oldLink, midDark)
      expect(result.passesAA).toBe(false)
      expect(result.ratio).toBeLessThan(4.5)
      expect(result.ratio).toBeCloseTo(3.87, 1)
    })

    it('verifies accessible link color (#93C5FD) passes WCAG AA on dark surface', () => {
      const newLink = parseHex('#93C5FD')! // blue-300
      const result = checkContrast(newLink, darkSurface)
      expect(result.passesAA).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.ratio).toBeCloseTo(8.14, 1)
    })

    it('verifies accessible link color (#93C5FD) passes WCAG AA on mid-dark (#374151)', () => {
      const newLink = parseHex('#93C5FD')!
      const result = checkContrast(newLink, midDark)
      expect(result.passesAA).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.ratio).toBeCloseTo(5.72, 1)
    })

    it('verifies accessible link hover color (#BFDBFE) passes WCAG AA on dark surface', () => {
      const hoverLink = parseHex('#BFDBFE')! // blue-200
      const result = checkContrast(hoverLink, darkSurface)
      expect(result.passesAA).toBe(true)
      expect(result.passesAAANormal).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(7.0)
    })
  })

  describe('Button Text Contrast on All Variants', () => {
    const whiteText = parseHex('#FFFFFF')!

    it('verifies primary button (#7C3AED) text contrast meets WCAG AA', () => {
      const primaryBg = parseHex('#7C3AED')!
      const result = checkContrast(whiteText, primaryBg)
      expect(result.passesAA).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.ratio).toBeCloseTo(5.70, 1)
    })

    it('verifies primary button hover state (#6D28D9) text contrast meets WCAG AAA', () => {
      const primaryHoverBg = parseHex('#6D28D9')!
      const result = checkContrast(whiteText, primaryHoverBg)
      expect(result.passesAA).toBe(true)
      expect(result.passesAAANormal).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(7.0)
    })

    it('verifies secondary button (#10133A) text contrast meets WCAG AAA', () => {
      const secondaryBg = parseHex('#10133A')!
      const result = checkContrast(whiteText, secondaryBg)
      expect(result.passesAA).toBe(true)
      expect(result.passesAAANormal).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(7.0)
      expect(result.ratio).toBeCloseTo(17.85, 1)
    })

    it('verifies danger button (#E11D48) text contrast meets WCAG AA', () => {
      const dangerBg = parseHex('#E11D48')!
      const result = checkContrast(whiteText, dangerBg)
      expect(result.passesAA).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.ratio).toBeCloseTo(4.70, 1)
    })

    it('verifies danger button hover state (#BE123C) text contrast meets WCAG AA', () => {
      const dangerHoverBg = parseHex('#BE123C')!
      const result = checkContrast(whiteText, dangerHoverBg)
      expect(result.passesAA).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.ratio).toBeCloseTo(6.29, 1)
    })
  })
})
