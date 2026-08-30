import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionPreview } from './TransactionPreview'

const baseProps = {
  operationName: 'upgrade_ship',
  feeStroops: '10000000',
  costs: [{ label: 'credits', amount: '500' }],
  outcomes: [{ label: 'Hull', value: '115' }],
  simulation: null,
  simulationError: null,
}

describe('TransactionPreview', () => {
  it('renders operation, fees, costs, and expected outcome', () => {
    render(<TransactionPreview {...baseProps} />)

    expect(screen.getByText('upgrade_ship')).toBeTruthy()
    // 10,000,000 stroops = 1 XLM.
    expect(screen.getByText('1.0000000 XLM')).toBeTruthy()
    expect(screen.getByText('credits')).toBeTruthy()
    expect(screen.getByText('500')).toBeTruthy()
    expect(screen.getByText('Hull')).toBeTruthy()
    expect(screen.getByText('115')).toBeTruthy()
  })

  it('uses the simulated minResourceFee when a simulation is provided', () => {
    render(
      <TransactionPreview
        {...baseProps}
        feeStroops={null}
        simulation={{
          status: 'success',
          value: null,
          latestLedger: 1,
          minResourceFee: '20000000',
          auth: [],
          events: [],
          transactionData: null,
          restorePreamble: null,
          error: null,
          raw: null,
        }}
      />
    )

    // 20,000,000 stroops = 2 XLM (from simulation, not the prop).
    expect(screen.getByText('2.0000000 XLM')).toBeTruthy()
  })

  it('warns when simulation predicts failure', () => {
    render(
      <TransactionPreview
        {...baseProps}
        simulationError="Simulation predicted failure."
        simulation={{
          status: 'error',
          value: null,
          latestLedger: 1,
          minResourceFee: '20000000',
          auth: [],
          events: [],
          transactionData: null,
          restorePreamble: null,
          error: 'Simulation predicted failure.',
          raw: null,
        }}
      />
    )

    expect(screen.getByText('Failure predicted')).toBeTruthy()
    expect(screen.getByText('Simulation predicted failure.')).toBeTruthy()
  })
})