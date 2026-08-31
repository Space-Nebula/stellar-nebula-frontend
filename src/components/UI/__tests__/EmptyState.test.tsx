import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import { EmptyState } from '../EmptyState'
import {
  EmptyAchievements,
  EmptyInventory,
  EmptyMarketplace,
  EmptyTransactions,
} from '../EmptyStates'

describe('EmptyState', () => {
  it('renders title, description and an accessible status region', () => {
    render(<EmptyState title="Nothing here" description="Come back later" icon="📦" />)

    const region = screen.getByRole('status')
    expect(region).toHaveTextContent('Nothing here')
    expect(region).toHaveTextContent('Come back later')
  })

  it('fires the primary action on click', async () => {
    const onClick = vi.fn()
    render(<EmptyState title="Empty" action={{ label: 'Do it', onClick }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Do it' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders an action as a link when href is provided', () => {
    render(<EmptyState title="Empty" action={{ label: 'Go', href: '/nebula' }} />)
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/nebula')
  })

  it('supports a secondary action alongside the primary', async () => {
    const primary = vi.fn()
    const secondary = vi.fn()
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Primary', onClick: primary }}
        secondaryAction={{ label: 'Secondary', onClick: secondary }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Secondary' }))
    expect(secondary).toHaveBeenCalledTimes(1)
    expect(primary).not.toHaveBeenCalled()
  })
})

describe('empty-state presets', () => {
  it('inventory preset has a helpful CTA', () => {
    render(<EmptyInventory />)
    expect(screen.getByText(/cargo hold is empty/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start scanning/i })).toBeInTheDocument()
  })

  it('transactions preset explains what will appear', () => {
    render(<EmptyTransactions />)
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })

  it('achievements preset has a CTA', () => {
    render(<EmptyAchievements />)
    expect(screen.getByText(/no achievements unlocked/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /explore the galaxy/i })).toBeInTheDocument()
  })

  it('marketplace preset renders', () => {
    render(<EmptyMarketplace />)
    expect(screen.getByText(/no market activity/i)).toBeInTheDocument()
  })

  it('lets callers override the preset action', async () => {
    const onClick = vi.fn()
    render(<EmptyInventory action={{ label: 'Custom CTA', onClick }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Custom CTA' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
