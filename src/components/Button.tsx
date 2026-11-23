import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button. */
  variant?: ButtonVariant
  /** Size preset — all presets enforce at least 44x44px touch target (WCAG 2.1 SC 2.5.5 AAA). */
  size?: ButtonSize
  /** Whether the button is in a loading state. */
  isLoading?: boolean
  /** Accessible label shown/announced while loading. */
  loadingText?: string
  /** Optional icon rendered before children. */
  leftIcon?: React.ReactNode
  /** Optional icon rendered after children. */
  rightIcon?: React.ReactNode
  /** Stretch button to full container width. */
  fullWidth?: boolean
  /** Forwarded to the underlying <button>. React 19 passes `ref` as a normal prop. */
  ref?: React.Ref<HTMLButtonElement>
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-cosmic-violet hover:bg-violet-700 active:bg-violet-800 text-white border border-transparent shadow-nebula-glow',
  secondary: 'bg-space-800 hover:bg-space-700 active:bg-space-600 text-white border border-space-600',
  ghost: 'bg-transparent hover:bg-space-800 active:bg-space-700 text-white border border-transparent',
  danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-transparent',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-touch min-w-touch px-3 py-2 text-sm',
  md: 'min-h-touch min-w-touch px-4 py-2.5 text-base',
  lg: 'min-h-touch-lg min-w-touch-lg px-6 py-3 text-lg',
  icon: 'min-h-touch min-w-touch p-2.5',
}

const MIN_DIMENSIONS: Record<ButtonSize, { minHeight: string; minWidth: string }> = {
  sm: { minHeight: '44px', minWidth: '44px' },
  md: { minHeight: '44px', minWidth: '44px' },
  lg: { minHeight: '48px', minWidth: '48px' },
  icon: { minHeight: '44px', minWidth: '44px' },
}

/**
 * Accessible Button component enforcing WCAG 2.1 SC 2.5.5 (AAA) minimum 44x44px touch target sizes
 * across all sizes and variants.
 *
 * Uses the React 19 ref-as-prop pattern instead of `forwardRef`.
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  type = 'button',
  className = '',
  style,
  children,
  ref,
  ...rest
}: ButtonProps) => {
  const isDisabled = Boolean(disabled || isLoading)
  const dimensions = MIN_DIMENSIONS[size]

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled ? true : undefined}
      aria-busy={isLoading ? true : undefined}
      data-variant={variant}
      data-size={size}
      className={`touch-target inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors select-none ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${
        isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`.trim()}
      style={{
        minHeight: dimensions.minHeight,
        minWidth: dimensions.minWidth,
        touchAction: 'manipulation',
        ...style,
      }}
      {...rest}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {!isLoading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {!isLoading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  )
}

Button.displayName = 'Button'

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation of the button group. */
  direction?: 'row' | 'column'
}

/**
 * Groups interactive touch targets with guaranteed >=8px (0.5rem) spacing
 * to prevent accidental adjacent taps on mobile devices.
 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  direction = 'row',
  className = '',
  style,
  children,
  ...rest
}) => {
  return (
    <div
      role="group"
      className={`touch-group inline-flex ${
        direction === 'column' ? 'flex-col' : 'flex-row flex-wrap'
      } gap-2 ${className}`.trim()}
      style={{
        gap: '8px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export default Button
