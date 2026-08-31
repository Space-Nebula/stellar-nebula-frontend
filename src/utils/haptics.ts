/**
 * Haptic feedback utilities using Vibration API.
 * Respects prefers-reduced-motion and user preferences.
 */

export type HapticPattern = number | number[]

const DEFAULT_PATTERNS = {
  scanStart: 20,
  scanComplete: 50,
  scanSuccess: [30, 40, 30] as number[],
  upgradeSuccess: [30, 50, 30] as number[],
  upgradeStart: 20,
  error: [100, 50, 100] as number[],
  warning: [50, 30, 50] as number[],
  light: 15,
  medium: 30,
  heavy: 60,
} as const

function canVibrate(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  if (!('vibrate' in navigator)) return false
  // Respect prefers-reduced-motion
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false
    }
  } catch {
    // ignore
  }
  return true
}

function triggerHaptic(pattern: HapticPattern): boolean {
  if (!canVibrate()) return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

export const haptics = {
  /** Vibrate on scan start - light tap */
  scanStarted: () => triggerHaptic(DEFAULT_PATTERNS.scanStart),
  /** Vibrate on scan complete - single pulse */
  scanComplete: () => triggerHaptic(DEFAULT_PATTERNS.scanComplete),
  /** Vibrate on successful resource harvest - double pulse */
  scanSuccess: () => triggerHaptic(DEFAULT_PATTERNS.scanSuccess),
  /** Vibrate on upgrade success - triple pattern */
  upgradeSuccess: () => triggerHaptic(DEFAULT_PATTERNS.upgradeSuccess),
  /** Vibrate on upgrade start */
  upgradeStart: () => triggerHaptic(DEFAULT_PATTERNS.upgradeStart),
  /** Vibrate on error - long double buzz */
  error: () => triggerHaptic(DEFAULT_PATTERNS.error),
  /** Vibrate on warning */
  warning: () => triggerHaptic(DEFAULT_PATTERNS.warning),
  light: () => triggerHaptic(DEFAULT_PATTERNS.light),
  medium: () => triggerHaptic(DEFAULT_PATTERNS.medium),
  heavy: () => triggerHaptic(DEFAULT_PATTERNS.heavy),
  /** Generic vibrate with custom pattern */
  custom: (pattern: HapticPattern) => triggerHaptic(pattern),
  /** Check if haptics is available (respects reduced motion) */
  isSupported: canVibrate,
}

export function triggerScanHaptic() {
  return haptics.scanComplete()
}

export function triggerUpgradeHaptic() {
  return haptics.upgradeSuccess()
}

export function triggerErrorHaptic() {
  return haptics.error()
}

export { canVibrate, triggerHaptic, DEFAULT_PATTERNS }
export default haptics
