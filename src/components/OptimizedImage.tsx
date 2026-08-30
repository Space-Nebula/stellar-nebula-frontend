/**
 * Optimized Image component with lazy loading, WebP support,
 * and responsive srcset.
 *
 * Issue #258: Image assets optimization
 */

import { useEffect, useRef, useState } from 'react'
import { lazyLoadImage, generateBlurPlaceholder } from '@utils/image-optimization'

export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
  srcSet?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  sizes,
  loading = 'lazy',
  srcSet,
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [blurPlaceholder] = useState(() => generateBlurPlaceholder())

  useEffect(() => {
    const img = imgRef.current
    if (!img || loading === 'eager') return

    lazyLoadImage(img)
  }, [loading])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  if (loading === 'eager') {
    return (
      <img
        src={src}
        srcSet={srcSet}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        onLoad={handleLoad}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    )
  }

  return (
    <img
      ref={imgRef}
      data-src={src}
      data-srcset={srcSet}
      src={blurPlaceholder}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={`lazy ${className}`}
      onLoad={handleLoad}
      loading="lazy"
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s ease-in-out',
        filter: isLoaded ? 'none' : 'blur(10px)',
      }}
    />
  )
}
