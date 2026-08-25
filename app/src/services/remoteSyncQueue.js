const OUTBOX_PREFIX = 'kkiu-remote-task-outbox-v1:'

const storageFor = (storage) => storage || globalThis.localStorage
const outboxKey = (userId) => `${OUTBOX_PREFIX}${userId}`

const isTask = (task) => Boolean(
  task
  && typeof task === 'object'
  && typeof task.id === 'string'
  && typeof task.title === 'string',
)

const isOperation = (operation) => Boolean(
  operation
  && typeof operation === 'object'
  && typeof operation.id === 'string'
  && isTask(operation.task)
  && operation.id === operation.task.id
  && (operation.circleId === null || typeof operation.circleId === 'string')
  && Number.isFinite(operation.position),
)

export function loadPendingTaskCreates(userId, storage) {
  if (!userId) return []
  try {
    const parsed = JSON.parse(storageFor(storage).getItem(outboxKey(userId)))
    return Array.isArray(parsed) ? parsed.filter(isOperation) : []
  } catch {
    return []
  }
}

const writePendingTaskCreates = (userId, operations, storage) => {
  const target = storageFor(storage)
  if (!operations.length) {
    target.removeItem(outboxKey(userId))
    return
  }
  target.setItem(outboxKey(userId), JSON.stringify(operations))
}

export function enqueueTaskCreates(userId, operations, storage) {
  if (!userId) return []
  const current = loadPendingTaskCreates(userId, storage)
  const byId = new Map(current.map((operation) => [operation.id, operation]))
  operations.filter(isOperation).forEach((operation) => {
    byId.set(operation.id, { ...operation, queuedAt: operation.queuedAt || new Date().toISOString() })
  })
  const next = [...byId.values()]
  writePendingTaskCreates(userId, next, storage)
  return next
}

const removeTaskCreates = (userId, ids, storage) => {
  const completed = new Set(ids)
  const remaining = loadPendingTaskCreates(userId, storage).filter((operation) => !completed.has(operation.id))
  writePendingTaskCreates(userId, remaining, storage)
  return remaining
}

const insertPending = (tasks, operations) => {
  const active = tasks.filter((task) => !task.done)
  const completed = tasks.filter((task) => task.done)
  const ids = new Set(tasks.map((task) => task.id))
  operations.forEach((operation) => {
    if (ids.has(operation.id)) return
    const position = Math.max(0, Math.min(Math.trunc(operation.position), active.length))
    active.splice(position, 0, operation.task)
    ids.add(operation.id)
  })
  return [...active, ...completed]
}

export function mergePendingTaskCreates(snapshot, operations) {
  if (!snapshot || !operations.length) return snapshot
  const personalOperations = operations.filter((operation) => operation.circleId === null)
  const circleOperations = new Map()
  operations.filter((operation) => operation.circleId !== null).forEach((operation) => {
    const items = circleOperations.get(operation.circleId) || []
    items.push(operation)
    circleOperations.set(operation.circleId, items)
  })

  return {
    ...snapshot,
    personal: insertPending(snapshot.personal || [], personalOperations),
    circles: (snapshot.circles || []).map((circle) => ({
      ...circle,
      tasks: insertPending(circle.tasks || [], circleOperations.get(circle.id) || []),
    })),
  }
}

const activeFlushes = new Map()

export function flushPendingTaskCreates(userId, createTask, storage) {
  if (!userId) return Promise.resolve([])
  if (activeFlushes.has(userId)) return activeFlushes.get(userId)

  const flush = (async () => {
    const allCompletedIds = []
    while (true) {
      const operations = loadPendingTaskCreates(userId, storage)
      if (!operations.length) return allCompletedIds

      const results = await Promise.allSettled(operations.map((operation) => createTask(operation)))
      const completedIds = []
      let firstError = null
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') completedIds.push(operations[index].id)
        else if (!firstError) firstError = result.reason
      })
      removeTaskCreates(userId, completedIds, storage)
      allCompletedIds.push(...completedIds)
      if (firstError) throw firstError
    }
  })().finally(() => {
    activeFlushes.delete(userId)
  })

  activeFlushes.set(userId, flush)
  return flush
}
