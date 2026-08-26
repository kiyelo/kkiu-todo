const OUTBOX_PREFIX = 'kkiu-task-mutation-outbox-v1:'

const storageFor = (storage) => storage || globalThis.localStorage
const keyFor = (userId) => `${OUTBOX_PREFIX}${userId}`

const validStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')

const isOperation = (operation) => Boolean(
  operation
  && typeof operation === 'object'
  && typeof operation.id === 'string'
  && typeof operation.kind === 'string'
  && (
    (operation.kind === 'update' && typeof operation.taskId === 'string' && operation.changes && typeof operation.changes === 'object')
    || (operation.kind === 'positions' && validStringArray(operation.taskIds))
    || (operation.kind === 'delete' && validStringArray(operation.taskIds))
  )
)

export function loadPendingTaskMutations(userId, storage) {
  if (!userId) return []
  try {
    const parsed = JSON.parse(storageFor(storage).getItem(keyFor(userId)))
    return Array.isArray(parsed) ? parsed.filter(isOperation) : []
  } catch {
    return []
  }
}

const writePendingTaskMutations = (userId, operations, storage) => {
  const target = storageFor(storage)
  if (!operations.length) {
    target.removeItem(keyFor(userId))
    return
  }
  target.setItem(keyFor(userId), JSON.stringify(operations))
}

export function enqueueTaskMutation(userId, operation, storage) {
  if (!userId || !isOperation(operation)) return []
  const current = loadPendingTaskMutations(userId, storage)
  const nextOperation = { ...operation, queuedAt: operation.queuedAt || new Date().toISOString() }

  // Repeated edits to the same task can be collapsed safely. Position and delete
  // operations keep their order because later operations may depend on earlier ones.
  if (operation.kind === 'update') {
    const previousIndex = current.findLastIndex((item) => item.kind === 'update' && item.taskId === operation.taskId)
    if (previousIndex >= 0) {
      const previous = current[previousIndex]
      current[previousIndex] = {
        ...previous,
        ...nextOperation,
        changes: { ...previous.changes, ...nextOperation.changes },
      }
      writePendingTaskMutations(userId, current, storage)
      return current
    }
  }

  const next = [...current, nextOperation]
  writePendingTaskMutations(userId, next, storage)
  return next
}

const removeMutation = (userId, operationId, storage) => {
  const remaining = loadPendingTaskMutations(userId, storage).filter((operation) => operation.id !== operationId)
  writePendingTaskMutations(userId, remaining, storage)
  return remaining
}

const activeFlushes = new Map()

export function flushPendingTaskMutations(userId, execute, storage) {
  if (!userId) return Promise.resolve([])
  if (activeFlushes.has(userId)) return activeFlushes.get(userId)

  const flush = (async () => {
    const completed = []
    while (true) {
      const [operation] = loadPendingTaskMutations(userId, storage)
      if (!operation) return completed
      await execute(operation)
      removeMutation(userId, operation.id, storage)
      completed.push(operation.id)
    }
  })().finally(() => activeFlushes.delete(userId))

  activeFlushes.set(userId, flush)
  return flush
}
