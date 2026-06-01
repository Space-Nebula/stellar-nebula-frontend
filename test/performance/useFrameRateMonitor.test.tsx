import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '../../src/test/utils'
import { useFrameRateMonitor } from '../../src/hooks/useFrameRateMonitor'

function FrameRateHarness({
  onSample,
}: {
  onSample: (sample: {
    fps: number
    averageFps: number
    sampleCount: number
    isWithinTarget: boolean
  }) => void
}) {
  const { fps, averageFps, isWithinTarget } = useFrameRateMonitor({
    enabled: true,
    targetFps: 60,
    sampleWindowMs: 1000,
    onSample,
  })

  return (
    <div>
      <div data-testid="fps">{fps}</div>
      <div data-testid="average-fps">{averageFps}</div>
      <div data-testid="within-target">{String(isWithinTarget)}</div>
    </div>
  )
}

describe('useFrameRateMonitor', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
  const originalNow = performance.now.bind(performance)

  let frameCallback: FrameRequestCallback | undefined

  beforeEach(() => {
    vi.restoreAllMocks()

    performance.now = vi.fn(() => 0) as unknown as typeof performance.now

    globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 1
    }) as typeof requestAnimationFrame

    globalThis.cancelAnimationFrame = vi.fn() as typeof cancelAnimationFrame
  })

  afterEach(() => {
    performance.now = originalNow
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame
    vi.restoreAllMocks()
    frameCallback = undefined
  })

  it('initializes frame metrics until samples are recorded', () => {
    render(<FrameRateHarness onSample={() => undefined} />)

    expect(screen.getByTestId('fps').textContent).toBe('0')
    expect(screen.getByTestId('average-fps').textContent).toBe('0')
    expect(screen.getByTestId('within-target').textContent).toBe('false')
  })
})
