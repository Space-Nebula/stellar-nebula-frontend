/* eslint-disable */
// Dedicated Web Worker: `self` here is a DedicatedWorkerGlobalScope, not a Window,
// but tsconfig.app.json only has the "DOM" lib (not "WebWorker") so the global
// `self`/`postMessage` typings TypeScript sees are the Window ones. Casting to
// `any` avoids fighting that mismatch for a few call sites in an isolated worker
// entry point that nothing else imports from.
/**
 * Generates nebula particle geometry off the main thread (#383).
 *
 * `generateNebulaGeometry` is a pure, deterministic function of its input (no
 * DOM/Three.js objects in or out - just typed arrays), which is what makes it
 * safe to run in a worker: it synchronously builds up to 100 000 particles'
 * worth of positions/colors/sizes/opacities, and running that on the main
 * thread is exactly the kind of long task that blocks input handling and
 * rendering for the duration of the calculation.
 */
import { generateNebulaGeometry, type NebulaConfig } from '@/utils/procedural/nebula'

interface NebulaWorkerRequest {
  requestId: string
  payload: NebulaConfig
}

const scope = self as any

scope.addEventListener('message', (event: MessageEvent<NebulaWorkerRequest>) => {
  const { requestId, payload } = event.data

  try {
    const geometry = generateNebulaGeometry(payload)
    scope.postMessage(
      { requestId, result: geometry },
      {
        // Transfer (not copy) the underlying buffers back to the main thread -
        // the worker has no further use for them once generation is done.
        transfer: [
          geometry.positions.buffer,
          geometry.colors.buffer,
          geometry.sizes.buffer,
          geometry.opacities.buffer,
        ],
      }
    )
  } catch (error) {
    scope.postMessage({
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export {}
