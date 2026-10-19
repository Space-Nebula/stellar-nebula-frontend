import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProceduralNebula } from '../useProceduralNebula'
import { generateNebulaGeometry } from '@/utils/procedural/nebula'

const runMock = vi.fn()
let isSupported = true

vi.mock('@/hooks/useWorker', () => ({
  useWorker: () => ({
    run: runMock,
    isSupported,
    terminate: vi.fn(),
  }),
}))

describe('useProceduralNebula', () => {
  beforeEach(() => {
    runMock.mockReset()
    isSupported = true
  })

  it('returns a null geometry and is not loading when config is null', () => {
    const { result } = renderHook(() => useProceduralNebula(null))
    expect(result.current.geometry).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('delegates generation to the worker and returns its result (#383)', async () => {
    const fakeGeometry = generateNebulaGeometry({ seed: 'tx-hash-1' })
    runMock.mockResolvedValue(fakeGeometry)

    const { result } = renderHook(() => useProceduralNebula({ seed: 'tx-hash-1' }))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(runMock).toHaveBeenCalledWith({
      seed: 'tx-hash-1',
      pattern: undefined,
      particleCount: undefined,
      radius: undefined,
    })
    expect(result.current.geometry).toBe(fakeGeometry)
  })

  it('falls back to synchronous generation when Web Workers are unsupported', async () => {
    isSupported = false

    const { result } = renderHook(() => useProceduralNebula({ seed: 'tx-hash-2' }))

    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.isLoading).toBe(false)
    expect(runMock).not.toHaveBeenCalled()
    expect(result.current.geometry?.positions.length).toBeGreaterThan(0)
  })

  it('falls back to synchronous generation when the worker rejects', async () => {
    runMock.mockRejectedValue(new Error('worker crashed'))

    const { result } = renderHook(() => useProceduralNebula({ seed: 'tx-hash-3' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry?.positions.length).toBeGreaterThan(0)
  })

  it('ignores a stale response if the config changes before the worker replies', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    runMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockResolvedValueOnce(generateNebulaGeometry({ seed: 'tx-hash-5' }))

    const { result, rerender } = renderHook(
      ({ seed }: { seed: string }) => useProceduralNebula({ seed }),
      { initialProps: { seed: 'tx-hash-4' } }
    )

    rerender({ seed: 'tx-hash-5' })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // The stale first request resolves after the second has already won.
    resolveFirst(generateNebulaGeometry({ seed: 'stale' }))

    expect(result.current.geometry?.positions).not.toEqual(
      generateNebulaGeometry({ seed: 'stale' }).positions
    )
  })
})
