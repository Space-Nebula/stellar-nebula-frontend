import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResourceTracker } from '../../src/utils/performance/memoryLeakTracker'
import { fireEvent, render, screen, waitFor } from '../../src/test/utils'
import { useRenderResourceTracker } from '../../src/hooks/useRenderResourceTracker'

function TrackingHarness() {
  const tracker = useRenderResourceTracker()
  const [leakCount, setLeakCount] = useState(0)

  return (
    <div>
      <button
        onClick={() => {
          const geometry = { dispose: vi.fn() }
          tracker.trackResource('geometry', 'geometry-1', geometry.dispose)

          const frameId = 42
          tracker.trackAnimationFrame(frameId)

          const removeListener = vi.fn()
          tracker.trackEventListener(window, 'resize', () => undefined, removeListener)
          setLeakCount(tracker.leakCount())
        }}
      >
        Track resources
      </button>
      <span>{leakCount}</span>
    </div>
  )
}

describe('memory leak tracker utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks and releases resources without leaking', () => {
    const tracker = createResourceTracker()
    const geometryDispose = vi.fn()
    const textureDispose = vi.fn()
    const materialDispose = vi.fn()

    tracker.trackResource('geometry', 'geometry-1', geometryDispose)
    tracker.trackResource('texture', 'texture-1', textureDispose)
    tracker.trackResource('material', 'material-1', materialDispose)

    tracker.releaseResource('geometry', 'geometry-1')
    tracker.releaseResource('texture', 'texture-1')
    tracker.releaseResource('material', 'material-1')

    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(textureDispose).toHaveBeenCalledTimes(1)
    expect(materialDispose).toHaveBeenCalledTimes(1)
    expect(tracker.hasLeaks()).toBe(false)
  })

  it('cleans up tracked resources when the hook unmounts', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')

    const { unmount } = render(<TrackingHarness />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalled()
    expect(cancelAnimationFrameSpy).toHaveBeenCalled()
  })
})
