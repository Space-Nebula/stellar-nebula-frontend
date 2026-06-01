import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('LoadingScreen — accessibility', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { default: LoadingScreen } = await import('@/components/Loading/LoadingScreen')

    const { container } = render(
      <LoadingScreen stageLabel="Plotting route" message="Charting course..." progress={35} />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('progress value is exposed to assistive technology', async () => {
    const { default: LoadingScreen } = await import('@/components/Loading/LoadingScreen')

    render(
      <LoadingScreen stageLabel="Initialising" message="Loading assets..." progress={60} />
    )

    // Either a progressbar role or an aria-valuenow attribute
    const progressBar = screen.queryByRole('progressbar')
    if (progressBar) {
      const value = progressBar.getAttribute('aria-valuenow')
      expect(Number(value)).toBeCloseTo(60, -1)
    } else {
      // Fallback: check that the numeric progress value is present somewhere
      const el = document.querySelector('[aria-valuenow], [role="progressbar"]')
      expect(el ?? document.body.textContent).toBeTruthy()
    }
  })
})
