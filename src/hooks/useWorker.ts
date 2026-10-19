import { useCallback, useEffect, useRef } from 'react'

/**
 * A response message a worker posts back. Workers created for this hook are
 * expected to tag every response with the `requestId` they were sent, so that
 * a worker that is reused for several requests can match replies to callers
 * even if responses arrive out of order.
 */
interface WorkerResponse<TResponse> {
  requestId: string
  result?: TResponse
  error?: string
}

interface UseWorkerResult<TRequest, TResponse> {
  /** Sends `payload` to the worker and resolves with its response. */
  run: (payload: TRequest) => Promise<TResponse>
  /** False in environments without the Worker API (e.g. some test/SSR environments). */
  isSupported: boolean
  /** Terminates the underlying worker; a new one is created lazily on the next `run`. */
  terminate: () => void
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Manages a single lazily-created Web Worker for the lifetime of the
 * component, exposing a request/response API instead of raw `postMessage`.
 *
 * Offloading expensive, pure calculations (procedural geometry, pathfinding,
 * image processing, ...) to a worker keeps them off the main thread so they
 * cannot block input handling or rendering with a long task (#383).
 *
 * `createWorker` must return a `new Worker(new URL('./some-worker.ts',
 * import.meta.url), { type: 'module' })` call (or similar) so Vite can bundle
 * the worker as a separate chunk.
 */
export function useWorker<TRequest, TResponse>(
  createWorker: () => Worker
): UseWorkerResult<TRequest, TResponse> {
  const workerRef = useRef<Worker | null>(null)
  const isSupported = typeof Worker !== 'undefined'

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const getWorker = useCallback((): Worker | null => {
    if (!isSupported) return null
    if (!workerRef.current) {
      workerRef.current = createWorker()
    }
    return workerRef.current
  }, [createWorker, isSupported])

  const run = useCallback(
    (payload: TRequest): Promise<TResponse> => {
      const maybeWorker = getWorker()

      if (!maybeWorker) {
        return Promise.reject(new Error('Web Workers are not supported in this environment'))
      }

      const worker: Worker = maybeWorker
      const requestId = createRequestId()

      return new Promise<TResponse>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<WorkerResponse<TResponse>>) => {
          if (event.data?.requestId !== requestId) return
          cleanup()
          if (event.data.error) {
            reject(new Error(event.data.error))
          } else {
            resolve(event.data.result as TResponse)
          }
        }

        const handleError = (event: ErrorEvent) => {
          cleanup()
          reject(event.error instanceof Error ? event.error : new Error(event.message))
        }

        function cleanup() {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
        }

        worker.addEventListener('message', handleMessage)
        worker.addEventListener('error', handleError)
        worker.postMessage({ requestId, payload })
      })
    },
    [getWorker]
  )

  // Terminate the worker when the component unmounts; a fresh one is created
  // lazily if `run` is called again.
  useEffect(() => terminate, [terminate])

  return { run, isSupported, terminate }
}
