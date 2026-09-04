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

const deletedTaskIds = (operations) => new Set(
  operations
    .filter((item) => item.kind === 'delete')
    .flatMap((item) => item.taskIds),
)

const normalizeBeforeAppend = (operations, nextOperation) => {
  if (nextOperation.kind === 'update') {
    if (deletedTaskIds(operations).has(nextOperation.taskId)) return operations
    return operations
  }

  if (nextOperation.kind === 'positions') {
    const deleted = deletedTaskIds(operations)
    const taskIds = nextOperation.taskIds.filter((id) => !deleted.has(id))
    if (!taskIds.length) return operations
    return [...operations, { ...nextOperation, taskIds }]
  }

  if (nextOperation.kind === 'delete') {
    const deleting = new Set(nextOperation.taskIds)
    const compacted = operations.flatMap((item) => {
      if (item.kind === 'update' && deleting.has(item.taskId)) return []
      if (item.kind === 'positions') {
        const taskIds = item.taskIds.filter((id) => !deleting.has(id))
        return taskIds.length ? [{ ...item, taskIds }] : []
      }
      if (item.kind === 'delete') {
        const taskIds = item.taskIds.filter((id) => !deleting.has(id))
        return taskIds.length ? [{ ...item, taskIds }] : []
      }
      return [item]
    })
    return [...compacted, nextOperation]
  }

  return [...operations, nextOperation]
}

export function enqueueTaskMutation(userId, operation, storage) {
  if (!userId || !isOperation(operation)) return []
  const current = loadPendingTaskMutations(userId, storage)
  const nextOperation = { ...operation, queuedAt: operation.queuedAt || new Date().toISOString() }

  // Repeated edits to the same task can be collapsed safely. Position and delete
  // operations keep their order because later operations may depend on earlier ones.
  if (operation.kind === 'update') {
    if (deletedTaskIds(current).has(operation.taskId)) return current
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

  const next = normalizeBeforeAppend(current, nextOperation)
  writePendingTaskMutations(userId, next, storage)
  return next
}

const applyUpdateToTasks = (tasks, operation) => tasks.map((task) => {
  if (task.id !== operation.taskId) return task
  const changes = operation.changes || {}
  const next = { ...task, ...changes }
  if (changes.done !== undefined) {
    next.done = Boolean(changes.done)
    next.doneAt = changes.done ? (changes.doneAt ?? task.doneAt ?? null) : null
    next.completedAt = changes.done ? (task.completedAt || operation.queuedAt || null) : null
  }
  return next
})

const applyPositionsToTasks = (tasks, operation) => {
  if (!operation.taskIds.length) return tasks
  const active = tasks.filter((task) => !task.done)
  const completed = tasks.filter((task) => task.done)
  const byId = new Map(active.map((task) => [task.id, task]))
  const ordered = operation.taskIds.map((id) => byId.get(id)).filter(Boolean)
  if (!ordered.length) return tasks
  const orderedIds = new Set(ordered.map((task) => task.id))
  const untouched = active.filter((task) => !orderedIds.has(task.id))
  return [...ordered, ...untouched, ...completed]
}

const applyDeleteToTasks = (tasks, operation) => {
  const deleting = new Set(operation.taskIds)
  return tasks.filter((task) => !deleting.has(task.id))
}

const applyOperationToTasks = (tasks, operation) => {
  if (operation.kind === 'update') return applyUpdateToTasks(tasks, operation)
  if (operation.kind === 'positions') return applyPositionsToTasks(tasks, operation)
  if (operation.kind === 'delete') return applyDeleteToTasks(tasks, operation)
  return tasks
}

export function mergePendingTaskMutations(snapshot, operations) {
  if (!snapshot || !operations?.length) return snapshot
  return operations.reduce((current, operation) => ({
    ...current,
    personal: applyOperationToTasks(current.personal || [], operation),
    circles: (current.circles || []).map((circle) => ({
      ...circle,
      tasks: applyOperationToTasks(circle.tasks || [], operation),
    })),
  }), snapshot)
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
