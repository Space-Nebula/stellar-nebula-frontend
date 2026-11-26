import type { ImgHTMLAttributes } from 'react'

export type ImageVariant = 'informative' | 'decorative'

interface BaseImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'aria-hidden'> {
  src: string
  /** Optional WebP source. `src` and `srcSet` remain the browser fallback. */
  webpSrc?: string
}

interface InformativeImageProps extends BaseImageProps {
  /** Describes the content or purpose of the image. Required for informative images. */
  variant: 'informative'
  alt: string
}

interface DecorativeImageProps extends BaseImageProps {
  /**
   * Marks the image as purely decorative — it conveys no information and must
   * be hidden from assistive technology.  The `alt` prop is omitted on purpose:
   * a decorative image must have `alt=""` and `aria-hidden="true"` so screen
   * readers skip it entirely.
   */
  variant: 'decorative'
  alt?: never
}

export type ImageProps = InformativeImageProps | DecorativeImageProps

/**
 * Accessible image primitive that enforces the WCAG 1.1.1 contract at the
 * type level.
 *
 * - `variant="informative"` requires a non-empty `alt` prop.
 * - `variant="decorative"` sets `alt=""` and `aria-hidden="true"` automatically.
 *
 * For images that need lazy loading, responsive srcset, or WebP fallback, use
 * `OptimizedImage` instead — it extends this contract with those features.
 */
export function Image(props: ImageProps) {
  if (props.variant === 'decorative') {
    const { variant: _variant, webpSrc, ...rest } = props
    return webpSrc ? (
      <picture>
        <source type="image/webp" srcSet={webpSrc} sizes={props.sizes} />
        <img {...rest} alt="" aria-hidden="true" />
      </picture>
    ) : (
      <img {...rest} alt="" aria-hidden="true" />
    )
  }

  const { variant: _variant, alt, webpSrc, ...rest } = props
  return webpSrc ? (
    <picture>
      <source type="image/webp" srcSet={webpSrc} sizes={props.sizes} />
      <img {...rest} alt={alt} />
    </picture>
  ) : (
    <img {...rest} alt={alt} />
  )
}

export default Image
