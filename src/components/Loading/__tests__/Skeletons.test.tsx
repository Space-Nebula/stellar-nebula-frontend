import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test/utils'
import { SkeletonDashboard } from '../SkeletonDashboard'
import { SkeletonNebulaView } from '../SkeletonNebulaView'
import { SkeletonMarketplace } from '../SkeletonMarketplace'
import { SkeletonLeaderboard } from '../SkeletonLeaderboard'

describe('Skeleton screens', () => {
  describe('SkeletonDashboard', () => {
    it('renders with aria-busy and accessible label', () => {
      render(<SkeletonDashboard />)
      const region = screen.getByRole('region', { name: /loading ship dashboard/i })
      expect(region).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('SkeletonNebulaView', () => {
    it('renders with aria-busy and accessible label', () => {
      render(<SkeletonNebulaView />)
      const region = screen.getByLabelText(/loading nebula view/i)
      expect(region).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('SkeletonMarketplace', () => {
    it('renders with aria-busy and accessible label', () => {
      render(<SkeletonMarketplace />)
      const region = screen.getByLabelText(/loading marketplace/i)
      expect(region).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('SkeletonLeaderboard', () => {
    it('renders with aria-busy and accessible label', () => {
      render(<SkeletonLeaderboard />)
      const region = screen.getByLabelText(/loading leaderboard/i)
      expect(region).toHaveAttribute('aria-busy', 'true')
    })

    it('renders placeholder rows', () => {
      const { container } = render(<SkeletonLeaderboard />)
      const rows = container.querySelectorAll('.skeleton-leaderboard-row')
      expect(rows.length).toBeGreaterThan(0)
    })
  })
})
