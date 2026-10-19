import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWorker } from '../useWorker'

/**
 * Minimal Worker double: echoes back whatever it is told to via
 * `respondWith`/`respondWithError`, matching the request/response contract
 * `useWorker` expects (a `requestId`-tagged message).
 */
class FakeWorker {
  listeners: Record<string, Array<(event: unknown) => void>> = { message: [], error: [] }
  posted: Array<{ requestId: string; payload: unknown }> = []
  terminated = false

  addEventListener(type: string, handler: (event: unknown) => void) {
    this.listeners[type]?.push(handler)
  }

  removeEventListener(type: string, handler: (event: unknown) => void) {
    const handlers = this.listeners[type]
    if (!handlers) return
    const index = handlers.indexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
  }

  postMessage(message: { requestId: string; payload: unknown }) {
    this.posted.push(message)
  }

  terminate() {
    this.terminated = true
  }

  /** Simulates the worker replying successfully to the given request. */
  respondWith(requestId: string, result: unknown) {
    this.listeners.message?.forEach((handler) => handler({ data: { requestId, result } }))
  }

  /** Simulates the worker replying with an error for the given request. */
  respondWithError(requestId: string, error: string) {
    this.listeners.message?.forEach((handler) => handler({ data: { requestId, error } }))
  }
}

describe('useWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports supported when the Worker API is available', () => {
    vi.stubGlobal('Worker', class {})
    const { result } = renderHook(() => useWorker(() => new FakeWorker() as unknown as Worker))
    expect(result.current.isSupported).toBe(true)
  })

  it('reports unsupported when the Worker API is unavailable', () => {
    vi.stubGlobal('Worker', undefined)
    const { result } = renderHook(() => useWorker(() => new FakeWorker() as unknown as Worker))
    expect(result.current.isSupported).toBe(false)
  })

  it('rejects run() when Web Workers are unsupported', async () => {
    vi.stubGlobal('Worker', undefined)
    const { result } = renderHook(() => useWorker(() => new FakeWorker() as unknown as Worker))
    await expect(result.current.run({ foo: 'bar' })).rejects.toThrow(/not supported/i)
  })

  it('resolves run() with the worker result, matched by request id', async () => {
    vi.stubGlobal('Worker', class {})
    let worker: FakeWorker = undefined as unknown as FakeWorker
    const { result } = renderHook(() =>
      useWorker(() => {
        worker = new FakeWorker()
        return worker as unknown as Worker
      })
    )

    const promise = result.current.run({ input: 42 })

    await waitFor(() => expect(worker.posted).toHaveLength(1))
    const { requestId } = worker.posted[0]
    worker.respondWith(requestId, { output: 84 })

    await expect(promise).resolves.toEqual({ output: 84 })
  })

  it('rejects run() when the worker responds with an error', async () => {
    vi.stubGlobal('Worker', class {})
    let worker: FakeWorker = undefined as unknown as FakeWorker
    const { result } = renderHook(() =>
      useWorker(() => {
        worker = new FakeWorker()
        return worker as unknown as Worker
      })
    )

    const promise = result.current.run({ input: 1 })
    await waitFor(() => expect(worker.posted).toHaveLength(1))
    worker.respondWithError(worker.posted[0].requestId, 'boom')

    await expect(promise).rejects.toThrow('boom')
  })

  it('reuses the same worker instance across multiple run() calls', async () => {
    vi.stubGlobal('Worker', class {})
    const createWorker = vi.fn(() => new FakeWorker() as unknown as Worker)
    const { result } = renderHook(() => useWorker(createWorker))

    const first = result.current.run({ a: 1 })
    const worker = createWorker.mock.results[0]!.value as unknown as FakeWorker
    await waitFor(() => expect(worker.posted).toHaveLength(1))
    worker.respondWith(worker.posted[0].requestId, 'first')
    await first

    const second = result.current.run({ a: 2 })
    await waitFor(() => expect(worker.posted).toHaveLength(2))
    worker.respondWith(worker.posted[1].requestId, 'second')
    await second

    expect(createWorker).toHaveBeenCalledTimes(1)
  })

  it('terminates the worker on unmount', async () => {
    vi.stubGlobal('Worker', class {})
    let worker: FakeWorker = undefined as unknown as FakeWorker
    const { result, unmount } = renderHook(() =>
      useWorker(() => {
        worker = new FakeWorker()
        return worker as unknown as Worker
      })
    )

    // Create the worker lazily by issuing a request.
    const promise = result.current.run({})
    await waitFor(() => expect(worker.posted).toHaveLength(1))
    worker.respondWith(worker.posted[0].requestId, 'ok')
    await promise

    unmount()
    expect(worker.terminated).toBe(true)
  })

  it('terminate() can be called explicitly', () => {
    vi.stubGlobal('Worker', class {})
    let worker: FakeWorker = undefined as unknown as FakeWorker
    const { result } = renderHook(() =>
      useWorker(() => {
        worker = new FakeWorker()
        return worker as unknown as Worker
      })
    )

    void result.current.run({})
    result.current.terminate()
    expect(worker!.terminated).toBe(true)
  })
})
