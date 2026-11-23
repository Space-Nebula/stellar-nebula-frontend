import { showError } from '@/utils/toast'
import type { XDR } from '@/types'

export interface QueuedTransaction<T = unknown> {
  id: string
  sequenceNumber?: number
  operationType: string
  payload: XDR
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  createdAt: number
}

export class TransactionQueue {
  private queue: QueuedTransaction<unknown>[] = []
  private isProcessing = false
  private locked = false
  private lastExecutedSequence: number | null = null

  /** Whether a transaction is currently in-flight or locked. */
  public isLocked(): boolean {
    return this.locked || this.isProcessing
  }

  /** Current pending queue length. */
  public get length(): number {
    return this.queue.length
  }

  /**
   * Acquire a transaction lock directly.
   * Returns true if lock was acquired, false if already locked.
   */
  public acquireLock(): boolean {
    if (this.locked) {
      return false
    }
    this.locked = true
    return true
  }

  /** Release the transaction lock. */
  public releaseLock(): void {
    this.locked = false
  }

  /**
   * Validates that the transaction sequence number is monotonically increasing
   * to prevent transaction replay attacks or out-of-order execution.
   */
  public verifySequence(sequenceNumber?: number): boolean {
    if (sequenceNumber === undefined || sequenceNumber === null) {
      return true
    }
    if (this.lastExecutedSequence !== null && sequenceNumber <= this.lastExecutedSequence) {
      return false
    }
    return true
  }

  /**
   * Enqueue an operation to be executed in strict sequence.
   * Prevents concurrent duplicate submissions from rapid clicks.
   */
  public async enqueue<T>(
    operationType: string,
    payload: XDR,
    execute: () => Promise<T>,
    sequenceNumber?: number
  ): Promise<T> {
    if (sequenceNumber !== undefined && !this.verifySequence(sequenceNumber)) {
      const errorMsg = `Transaction rejected: sequence number ${sequenceNumber} is outdated or replayed.`
      showError(errorMsg)
      throw new Error(errorMsg)
    }

    return new Promise<T>((resolve, reject) => {
      const item: QueuedTransaction<T> = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        sequenceNumber,
        operationType,
        payload,
        execute,
        resolve,
        reject,
        createdAt: Date.now(),
      }

      this.queue.push(item as QueuedTransaction<unknown>)
      void this.processNext()
    })
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true
    this.locked = true

    const current = this.queue.shift()
    if (!current) {
      this.isProcessing = false
      this.locked = false
      return
    }

    try {
      const result = await current.execute()
      if (current.sequenceNumber !== undefined) {
        this.lastExecutedSequence = current.sequenceNumber
      }
      current.resolve(result)
    } catch (err) {
      current.reject(err)
    } finally {
      this.isProcessing = false
      this.locked = false

      if (this.queue.length > 0) {
        void this.processNext()
      }
    }
  }

  /** Clear all pending transactions from the queue. */
  public clear(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      item?.reject(new Error('Transaction queue cleared.'))
    }
    this.locked = false
    this.isProcessing = false
  }
}

export const globalTransactionQueue = new TransactionQueue()

export function isTransactionLocked(): boolean {
  return globalTransactionQueue.isLocked()
}

export function acquireTransactionLock(): boolean {
  return globalTransactionQueue.acquireLock()
}

export function releaseTransactionLock(): void {
  globalTransactionQueue.releaseLock()
}
