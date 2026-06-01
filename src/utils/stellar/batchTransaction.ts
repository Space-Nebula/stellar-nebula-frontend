export const DEFAULT_BATCH_BASE_FEE_STROOPS = 100
export const MAX_BATCH_OPERATIONS = 100

export interface BatchOperation<TKind extends string = string, TPayload = unknown> {
  id: string
  kind: TKind
  description: string
  payload: TPayload
  dependsOn?: readonly string[]
  feeStroops?: number
}

export interface CreateBatchOperationInput<TKind extends string, TPayload> {
  id?: string
  kind: TKind
  description: string
  payload: TPayload
  dependsOn?: readonly string[]
  feeStroops?: number
}

export interface BatchTransactionValidationError {
  code:
    | 'EMPTY_BATCH'
    | 'TOO_MANY_OPERATIONS'
    | 'DUPLICATE_OPERATION'
    | 'MISSING_DEPENDENCY'
    | 'INVALID_ORDER'
  message: string
  index?: number
  operationId?: string
  dependencyId?: string
}

export interface BatchTransactionPlan<TOperation extends BatchOperation = BatchOperation> {
  operations: readonly TOperation[]
  totalOperations: number
  totalFeeStroops: number
  isValid: boolean
  errors: BatchTransactionValidationError[]
}

export interface BatchTransactionOptions {
  baseFeeStroops?: number
  maxOperations?: number
}

export interface BatchTransactionBuilder<TOperation extends BatchOperation = BatchOperation> {
  addOperation: (operation: TOperation) => BatchTransactionBuilder<TOperation>
  insertOperation: (index: number, operation: TOperation) => BatchTransactionBuilder<TOperation>
  replaceOperations: (operations: readonly TOperation[]) => BatchTransactionBuilder<TOperation>
  clear: () => BatchTransactionBuilder<TOperation>
  build: () => BatchTransactionPlan<TOperation>
  list: () => readonly TOperation[]
}

function createOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `batch-${Math.random().toString(36).slice(2, 10)}`
}

export function createBatchOperation<TKind extends string, TPayload>(
  input: CreateBatchOperationInput<TKind, TPayload>
): BatchOperation<TKind, TPayload> {
  return {
    id: input.id ?? createOperationId(),
    kind: input.kind,
    description: input.description,
    payload: input.payload,
    dependsOn: input.dependsOn,
    feeStroops: input.feeStroops,
  }
}

export function calculateBatchFee(
  operations: readonly BatchOperation[],
  baseFeeStroops = DEFAULT_BATCH_BASE_FEE_STROOPS
): number {
  return operations.reduce(
    (total, operation) => total + baseFeeStroops + (operation.feeStroops ?? 0),
    0
  )
}

export function validateBatchOperations(
  operations: readonly BatchOperation[],
  maxOperations = MAX_BATCH_OPERATIONS
): BatchTransactionValidationError[] {
  const errors: BatchTransactionValidationError[] = []

  if (operations.length === 0) {
    errors.push({
      code: 'EMPTY_BATCH',
      message: 'At least one operation is required.',
    })
    return errors
  }

  if (operations.length > maxOperations) {
    errors.push({
      code: 'TOO_MANY_OPERATIONS',
      message: `Batch operations cannot exceed ${maxOperations}.`,
    })
  }

  const seenIds = new Map<string, number>()

  operations.forEach((operation, index) => {
    const previousIndex = seenIds.get(operation.id)
    if (previousIndex !== undefined) {
      errors.push({
        code: 'DUPLICATE_OPERATION',
        message: `Operation "${operation.id}" is duplicated.`,
        index,
        operationId: operation.id,
      })
    } else {
      seenIds.set(operation.id, index)
    }

    for (const dependencyId of operation.dependsOn ?? []) {
      const dependencyIndex = seenIds.get(dependencyId)
      if (dependencyIndex === undefined) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Operation "${operation.id}" depends on missing operation "${dependencyId}".`,
          index,
          operationId: operation.id,
          dependencyId,
        })
        continue
      }

      if (dependencyIndex >= index) {
        errors.push({
          code: 'INVALID_ORDER',
          message: `Operation "${operation.id}" must come after "${dependencyId}".`,
          index,
          operationId: operation.id,
          dependencyId,
        })
      }
    }
  })

  return errors
}

export function buildBatchTransaction<TOperation extends BatchOperation>(
  operations: readonly TOperation[],
  options: BatchTransactionOptions = {}
): BatchTransactionPlan<TOperation> {
  const errors = validateBatchOperations(operations, options.maxOperations)

  return {
    operations: [...operations],
    totalOperations: operations.length,
    totalFeeStroops: calculateBatchFee(operations, options.baseFeeStroops),
    isValid: errors.length === 0,
    errors,
  }
}

export function createBatchTransactionBuilder<TOperation extends BatchOperation>(
  options: BatchTransactionOptions = {}
): BatchTransactionBuilder<TOperation> {
  let operations: TOperation[] = []

  return {
    addOperation(operation) {
      operations = [...operations, operation]
      return this
    },
    insertOperation(index, operation) {
      const next = [...operations]
      next.splice(index, 0, operation)
      operations = next
      return this
    },
    replaceOperations(nextOperations) {
      operations = [...nextOperations]
      return this
    },
    clear() {
      operations = []
      return this
    },
    build() {
      return buildBatchTransaction(operations, options)
    },
    list() {
      return [...operations]
    },
  }
}
