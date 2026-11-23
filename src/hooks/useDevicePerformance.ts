/**
 * Hook to detect device hardware capability tier and manage adaptive graphics quality.
 *
 * Performance Tiers:
 * - 'low': Mid-range or budget mobile devices (e.g., Pixel 4a, Samsung A52) with <= 4 cores,
 *          budget mobile GPUs (Adreno 618, Mali-G52), or <= 4GB RAM.
 * - 'medium': Upper mid-range devices with 6 cores or mid-range GPUs.
 * - 'high': Desktop PCs and flagship devices with >= 8 cores and discrete / high-end GPUs.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'

export type PerformanceTier = 'low' | 'medium' | 'high'
export type QualitySetting = 'low' | 'medium' | 'high'

export interface DevicePerformanceInfo {
  tier: PerformanceTier
  quality: QualitySetting
  setQuality: (quality: QualitySetting) => void
  isMobile: boolean
  cores: number
  deviceMemoryGb?: number
  gpuRenderer: string
  particleBudget: number
  isAutoAdjusted: boolean
  setIsAutoAdjusted: (value: boolean) => void
}

export const PARTICLE_BUDGETS: Record<QualitySetting, number> = {
  low: 3000,    // Optimized for mid-range mobile (≤3k particles)
  medium: 6000, // Balanced for tablets and modern mobile
  high: 10000,  // Desktop high-fidelity baseline
}

/**
 * Inspect WebGL context for GPU unmasked renderer string.
 */
function getGpuRenderer(): string {
  if (typeof window === 'undefined') return 'unknown'

  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    if (!gl) return 'no-webgl'

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'generic-webgl'
    }

    return gl.getParameter(gl.RENDERER) || 'generic-webgl'
  } catch {
    return 'unknown'
  }
}

/**
 * Check if the device is a mobile device based on user agent, touch points, or screen width.
 */
function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false

  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  if (nav.userAgentData?.mobile !== undefined) {
    return nav.userAgentData.mobile
  }

  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches

  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  const isMobileUa = mobileRegex.test(navigator.userAgent || '')

  return (hasTouch && isSmallScreen) || isMobileUa
}

/**
 * Determine device performance tier using hardware concurrency, memory, and GPU info.
 */
export function detectDeviceTier(): {
  tier: PerformanceTier
  cores: number
  memoryGb?: number
  gpuRenderer: string
  isMobile: boolean
} {
  const isMobile = detectIsMobile()
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  const memoryGb =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined
  const gpuRenderer = getGpuRenderer()
  const lowerGpu = gpuRenderer.toLowerCase()

  // Detect mid-range/budget mobile GPUs like Adreno 618 (Pixel 4a, Samsung A52), Mali-G52/G57, PowerVR
  const isBudgetMobileGpu =
    lowerGpu.includes('adreno 618') ||
    lowerGpu.includes('adreno 610') ||
    lowerGpu.includes('adreno 612') ||
    lowerGpu.includes('mali-g52') ||
    lowerGpu.includes('mali-g57') ||
    lowerGpu.includes('powervr') ||
    lowerGpu.includes('apple a10') ||
    lowerGpu.includes('apple a11')

  let tier: PerformanceTier = 'high'

  if (isMobile) {
    if (cores <= 4 || isBudgetMobileGpu || (memoryGb !== undefined && memoryGb <= 4)) {
      tier = 'low'
    } else if (cores <= 6 || (memoryGb !== undefined && memoryGb <= 6)) {
      tier = 'medium'
    } else {
      // High-end mobile (e.g. Snapdragon 8 Gen 2, A16 Bionic)
      tier = 'medium'
    }
  } else {
    // Desktop devices
    if (cores <= 4 || (memoryGb !== undefined && memoryGb <= 4)) {
      tier = 'low'
    } else if (cores <= 6) {
      tier = 'medium'
    } else {
      tier = 'high'
    }
  }

  return { tier, cores, memoryGb, gpuRenderer, isMobile }
}

export function useDevicePerformance(): DevicePerformanceInfo {
  const hardware = useMemo(() => detectDeviceTier(), [])
  const [quality, setQualityState] = useState<QualitySetting>(hardware.tier)
  const [isAutoAdjusted, setIsAutoAdjusted] = useState<boolean>(false)

  // Load user manual override from localStorage if set
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('stellar_nebula_quality') as QualitySetting | null
      if (saved && ['low', 'medium', 'high'].includes(saved)) {
        setQualityState(saved)
      }
    } catch {
      // Ignore storage access errors
    }
  }, [])

  const setQuality = useCallback((newQuality: QualitySetting) => {
    setQualityState(newQuality)
    setIsAutoAdjusted(false)
    try {
      localStorage.setItem('stellar_nebula_quality', newQuality)
    } catch {
      // Ignore storage access errors
    }
  }, [])

  const particleBudget = PARTICLE_BUDGETS[quality]

  return {
    tier: hardware.tier,
    quality,
    setQuality,
    isMobile: hardware.isMobile,
    cores: hardware.cores,
    deviceMemoryGb: hardware.memoryGb,
    gpuRenderer: hardware.gpuRenderer,
    particleBudget,
    isAutoAdjusted,
    setIsAutoAdjusted,
  }
}
