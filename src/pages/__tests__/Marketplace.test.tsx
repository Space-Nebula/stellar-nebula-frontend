import { describe, expect, it } from 'vitest'
import { render, screen } from '../../test/utils'
import Marketplace from '../Marketplace'

describe('Marketplace page', () => {
  it('renders the marketplace hero copy alongside the exchange interface', () => {
    render(<Marketplace />)

    expect(
      screen.getByRole('heading', { name: /trade modules and mission supplies/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /stellar exchange/i })).toBeInTheDocument()
    expect(screen.getByText(/trade resources directly on the stellar network/i)).toBeInTheDocument()
  })

  it('scopes the exchange region for assistive technology', () => {
    render(<Marketplace />)

    expect(screen.getByRole('region', { name: /stellar exchange/i })).toBeInTheDocument()
  })
})
