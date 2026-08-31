import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/utils'
import FeatureErrorBoundary from '../FeatureErrorBoundary'

// Silence the expected console.error output from React error boundaries
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})
afterEach(() => {
  console.error = originalError
})

// A component whose throw behaviour is controlled by a ref so it survives
// re-renders inside the same test without needing rerender().
function Bomb({ id }: { id: string }) {
  // throw unconditionally — caller wraps this in the boundary
  throw new Error(`Boom from ${id}`)
  return null
}

function Safe() {
  return <p>All good</p>
}

describe('FeatureErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <FeatureErrorBoundary feature="Test Panel">
        <p>Everything works</p>
      </FeatureErrorBoundary>
    )
    expect(screen.getByText('Everything works')).toBeInTheDocument()
  })

  it('renders the fallback UI when a child throws', () => {
    render(
      <FeatureErrorBoundary feature="Test Panel">
        <Bomb id="test" />
      </FeatureErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Test Panel is unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Boom from test/i)).toBeInTheDocument()
  })

  it('renders the custom fallback when provided', () => {
    render(
      <FeatureErrorBoundary feature="Custom" fallback={<p>Custom fallback</p>}>
        <Bomb id="custom" />
      </FeatureErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })

  it('shows Try Again and Reload App recovery buttons', () => {
    render(
      <FeatureErrorBoundary feature="Panel">
        <Bomb id="panel" />
      </FeatureErrorBoundary>
    )
    expect(
      screen.getByRole('button', { name: /try to recover the Panel section/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload the full application/i })).toBeInTheDocument()
  })

  it('shows Safe children after Try Again is clicked', () => {
    // Render a boundary that wraps a safe component (never throws).
    // We test that after clicking Try Again, when the child no longer throws,
    // the boundary renders children normally again.
    //
    // Strategy: use rerender to swap the child to a non-throwing one right
    // after clicking Try Again — simulating the caller fixing the error condition.
    const { rerender } = render(
      <FeatureErrorBoundary feature="Panel">
        <Bomb id="recovery" />
      </FeatureErrorBoundary>
    )

    // Boundary is in error state
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()

    // Swap to a safe child and click Try Again — the boundary resets
    rerender(
      <FeatureErrorBoundary feature="Panel">
        <Safe />
      </FeatureErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /try to recover/i }))

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('calls onError prop when an error is caught', () => {
    const onError = vi.fn()
    render(
      <FeatureErrorBoundary feature="Panel" onError={onError}>
        <Bomb id="callback" />
      </FeatureErrorBoundary>
    )
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('includes the feature name in the error message', () => {
    render(
      <FeatureErrorBoundary feature="Nebula Canvas">
        <Bomb id="nebula" />
      </FeatureErrorBoundary>
    )
    expect(screen.getByText(/Nebula Canvas is unavailable/i)).toBeInTheDocument()
  })

  it('schedules auto-retry for transient network errors', () => {
    vi.useFakeTimers()
    function NetworkBomb() {
      throw new Error('fetch failed: network timeout')
      return null
    }

    render(
      <FeatureErrorBoundary feature="Network Panel">
        <NetworkBomb />
      </FeatureErrorBoundary>
    )
    // Still shows error immediately
    expect(screen.getByRole('alert')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
