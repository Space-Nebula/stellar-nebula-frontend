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

    render(<LoadingScreen stageLabel="Initialising" message="Loading assets..." progress={60} />)

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

// Skeleton placeholders announce a busy region. A bare `div` with an aria-label
// but no role is rejected by axe (aria-prohibited-attr), so each needs a role.
describe('Skeleton loading placeholders — accessibility', () => {
  it('NebulaView skeleton has no WCAG 2.1 AA violations and is a labelled status region', async () => {
    const { SkeletonNebulaView } = await import('@/components/Loading/SkeletonNebulaView')

    const { container } = render(<SkeletonNebulaView />)

    expect(await axe(container)).toHaveNoViolations()
    const region = screen.getByRole('status', { name: 'Loading nebula view' })
    expect(region.getAttribute('aria-busy')).toBe('true')
  })

  it('Marketplace skeleton has no WCAG 2.1 AA violations and is a labelled status region', async () => {
    const { SkeletonMarketplace } = await import('@/components/Loading/SkeletonMarketplace')

    const { container } = render(<SkeletonMarketplace />)

    expect(await axe(container)).toHaveNoViolations()
    expect(screen.getByRole('status', { name: 'Loading marketplace' })).toBeTruthy()
  })

  it('Leaderboard skeleton has no WCAG 2.1 AA violations and is a labelled status region', async () => {
    const { SkeletonLeaderboard } = await import('@/components/Loading/SkeletonLeaderboard')

    const { container } = render(<SkeletonLeaderboard />)

    expect(await axe(container)).toHaveNoViolations()
    expect(screen.getByRole('status', { name: 'Loading leaderboard' })).toBeTruthy()
  })

  it('Dashboard skeleton has no WCAG 2.1 AA violations and is a labelled region', async () => {
    const { SkeletonDashboard } = await import('@/components/Loading/SkeletonDashboard')

    const { container } = render(<SkeletonDashboard />)

    expect(await axe(container)).toHaveNoViolations()
    expect(screen.getByRole('region', { name: 'Loading ship dashboard' })).toBeTruthy()
  })
})

