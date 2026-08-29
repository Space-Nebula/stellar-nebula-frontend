/**
 * Image optimization utilities for responsive images, lazy loading,
 * and WebP format support.
 *
 * Issue #258: Image assets optimization
 */

/**
 * Generate srcset for responsive images.
 */
export function generateSrcSet(imagePath: string, sizes: number[]): string {
  return sizes.map((size) => `${imagePath}?w=${size} ${size}w`).join(', ')
}

/**
 * Check if browser supports WebP format.
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webpData =
      'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='
    const img = new Image()
    img.onload = () => resolve(img.width === 1)
    img.onerror = () => resolve(false)
    img.src = webpData
  })
}

/**
 * Get optimized image URL with WebP fallback.
 */
export async function getOptimizedImageUrl(imagePath: string): Promise<string> {
  const isWebPSupported = await supportsWebP()

  if (isWebPSupported && !imagePath.endsWith('.svg')) {
    // Replace extension with .webp
    return imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  }

  return imagePath
}

/**
 * Lazy load images using Intersection Observer.
 */
export function lazyLoadImage(img: HTMLImageElement): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lazyImage = entry.target as HTMLImageElement
            const src = lazyImage.dataset.src
            const srcset = lazyImage.dataset.srcset

            if (src) lazyImage.src = src
            if (srcset) lazyImage.srcset = srcset

            lazyImage.classList.remove('lazy')
            lazyImage.classList.add('loaded')
            observer.unobserve(lazyImage)
          }
        })
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    )

    observer.observe(img)
  } else {
    // Fallback for older browsers
    const src = img.dataset.src
    const srcset = img.dataset.srcset
    if (src) img.src = src
    if (srcset) img.srcset = srcset
  }
}

/**
 * React component for optimized lazy-loaded images.
 */
export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
}

/**
 * Preload critical images for better performance.
 */
export function preloadImage(src: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  document.head.appendChild(link)
}

/**
 * Compress image URL by adding quality and format parameters.
 * Works with image CDNs that support URL-based transformations.
 */
export function compressImageUrl(
  url: string,
  options: {
    quality?: number
    width?: number
    height?: number
    format?: 'webp' | 'avif' | 'jpg' | 'png'
  } = {}
): string {
  const { quality = 80, width, height, format } = options

  const params = new URLSearchParams()
  if (quality) params.append('q', quality.toString())
  if (width) params.append('w', width.toString())
  if (height) params.append('h', height.toString())
  if (format) params.append('fm', format)

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.toString()}`
}

/**
 * Generate blur placeholder data URL for images.
 */
export function generateBlurPlaceholder(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (ctx) {
    // Create a simple gradient as placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#1a1a2e')
    gradient.addColorStop(1, '#16213e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  return canvas.toDataURL('image/jpeg', 0.1)
}

/**
 * Calculate optimal image sizes based on viewport and device pixel ratio.
 */
export function calculateOptimalImageSize(containerWidth: number): number {
  const dpr = window.devicePixelRatio || 1
  const optimalWidth = Math.ceil(containerWidth * dpr)

  // Round up to nearest standard size
  const standardSizes = [320, 640, 768, 1024, 1280, 1536, 1920, 2560]
  return standardSizes.find((size) => size >= optimalWidth) || 2560
}
