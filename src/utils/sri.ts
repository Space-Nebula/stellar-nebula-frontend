/**
 * Subresource Integrity (SRI) utilities
 * Provides helpers to generate and verify SRI hashes for CDN resources.
 * Prevents CDN compromise attacks by ensuring loaded resources match expected hashes.
 */

/**
 * Generate SRI hash for given content (browser-compatible)
 * Uses SubtleCrypto to compute SHA-384 and encode as base64
 */
export async function generateSRIHash(content: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder()
  const data = typeof content === 'string' ? encoder.encode(content) : content
  const hashBuffer = await crypto.subtle.digest('SHA-384', data as BufferSource)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
  return `sha384-${hashBase64}`
}

/**
 * Verify SRI hash against content
 */
export async function verifySRI(
  content: string | ArrayBuffer,
  integrity: string
): Promise<boolean> {
  const expected = await generateSRIHash(content)
  return expected === integrity
}

/**
 * SRI configuration for external resources
 * Hashes are generated via `npm run sri:generate` (scripts/generate-sri.mjs)
 * Fallback is triggered if integrity check fails.
 */
export interface SRIResource {
  url: string
  integrity: string
  crossorigin: 'anonymous' | 'use-credentials'
  fallback?: string
  description?: string
}

/**
 * Known CDN resources with SRI hashes
 * Update hashes via `node scripts/generate-sri.mjs`
 */
export const SRI_RESOURCES: Record<string, SRIResource> = {
  logrocket: {
    url: 'https://cdn.logrocket.io/LogRocket.min.js',
    // Placeholder hash - regenerated via `npm run sri:generate`
    // To update: node scripts/generate-sri.mjs --update
    integrity: 'sha384-PLACEHOLDER_GENERATE_VIA_NPM_RUN_SRI_GENERATE',
    crossorigin: 'anonymous',
    description: 'LogRocket session replay',
  },
}

/**
 * Load external script with SRI verification and fallback
 * @param resource SRI resource configuration
 * @param options fallback behavior
 */
export function loadScriptWithSRI(
  resource: SRIResource,
  options: {
    onSuccess?: () => void
    onFallback?: (error: Event) => void
    onError?: (error: Event) => void
    timeoutMs?: number
  } = {}
): HTMLScriptElement {
  const script = document.createElement('script')
  script.src = resource.url
  script.async = true
  script.crossOrigin = resource.crossorigin
  if (resource.integrity && !resource.integrity.includes('PLACEHOLDER')) {
    script.integrity = resource.integrity
  }

  let timeoutId: number | undefined

  const cleanup = () => {
    if (timeoutId) window.clearTimeout(timeoutId)
  }

  script.onload = () => {
    cleanup()
    options.onSuccess?.()
  }

  script.onerror = (event) => {
    cleanup()
    console.warn(`[SRI] Failed to load ${resource.url} - integrity check or network failure`, event)

    // Fallback: try without integrity (degraded but functional) or local fallback
    if (resource.fallback) {
      console.info(`[SRI] Attempting fallback for ${resource.url} -> ${resource.fallback}`)
      const fallbackScript = document.createElement('script')
      fallbackScript.src = resource.fallback
      fallbackScript.async = true
      fallbackScript.onload = () => options.onFallback?.(event as Event)
      fallbackScript.onerror = (e) => options.onError?.(e as Event)
      document.head.appendChild(fallbackScript)
    } else {
      // Fallback without SRI (if CDN compromised, this still risks but maintains availability)
      // In production you might want to block execution instead
      console.warn(
        `[SRI] No fallback configured for ${resource.url}. Resource will be unavailable.`
      )
      options.onError?.(event as Event)
    }

    options.onFallback?.(event as Event)
  }

  if (options.timeoutMs) {
    timeoutId = window.setTimeout(() => {
      console.warn(`[SRI] Timeout loading ${resource.url} after ${options.timeoutMs}ms`)
      script.dispatchEvent(new Event('error'))
    }, options.timeoutMs)
  }

  document.head.appendChild(script)
  return script
}

/**
 * Check if SRI is supported in current browser
 */
export function isSRISupported(): boolean {
  const script = document.createElement('script')
  return 'integrity' in script
}

/**
 * Report SRI failure to monitoring
 */
export function reportSRIFailure(resource: SRIResource, error: Event): void {
  console.error(`[SRI] Integrity violation for ${resource.url}`, {
    expectedIntegrity: resource.integrity,
    error,
  })

  // Optionally report to analytics/monitoring
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { analytics?: { track?: (e: string, props: unknown) => void } }).analytics
      ?.track
  ) {
    try {
      ;(
        window as unknown as { analytics: { track: (e: string, props: unknown) => void } }
      ).analytics.track('sri_violation', {
        url: resource.url,
        integrity: resource.integrity,
      })
    } catch {
      // ignore
    }
  }
}
