import React from 'react'

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
  isExternal?: boolean
  className?: string
  ref?: React.Ref<HTMLAnchorElement>
}

/**
 * Accessible Link component adhering to WCAG 2.1 AA contrast requirements.
 *
 * Uses #93C5FD (blue-300 / dark-link) which provides 8.14:1 contrast on #1F2937
 * and 5.72:1 contrast on #374151, exceeding the required 4.5:1 ratio.
 * Underline is enforced to ensure non-color visual affordance (WCAG 2.1 SC 1.4.1).
 */
export const Link = ({
  href,
  children,
  isExternal = false,
  className = '',
  ref,
  ...rest
}: LinkProps) => {
  const isExternalLink = isExternal || /^https?:\/\//.test(href)

  return (
    <a
      ref={ref}
      href={href}
      target={isExternalLink ? '_blank' : undefined}
      rel={isExternalLink ? 'noopener noreferrer' : undefined}
      className={`text-[#93c5fd] hover:text-[#bfdbfe] dark:text-dark-link dark:hover:text-dark-link-hover underline underline-offset-4 decoration-[#93c5fd]/60 hover:decoration-[#bfdbfe] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-cyan rounded-sm font-medium ${className}`.trim()}
      {...rest}
    >
      {children}
      {isExternalLink && (
        <span className="sr-only"> (opens in a new tab)</span>
      )}
    </a>
  )
}

export default Link
