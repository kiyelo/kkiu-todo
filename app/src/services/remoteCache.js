import { loadPendingTaskCreates, mergePendingTaskCreates } from './remoteSyncQueue.js'
import { loadPendingTaskMutations, mergePendingTaskMutations } from './taskMutationOutbox.js'

const CACHE_PREFIX = 'kkiu-remote-cache-v1:'
const LAST_REMOTE_USER_KEY = 'kkiu-last-remote-user-v1'

const cacheKey = (userId) => `${CACHE_PREFIX}${userId}`

const validSnapshot = (value) => Boolean(
  value
  && typeof value === 'object'
  && Array.isArray(value.personal)
  && Array.isArray(value.circles)
  && value.settings
  && typeof value.settings === 'object',
)

const hydratePendingChanges = (userId, snapshot) => {
  const withCreates = mergePendingTaskCreates(snapshot, loadPendingTaskCreates(userId))
  return mergePendingTaskMutations(withCreates, loadPendingTaskMutations(userId))
}

export function loadRemoteSnapshot(userId) {
  if (!userId) return null
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey(userId)))
    if (!validSnapshot(value)) return null
    return hydratePendingChanges(userId, value)
  } catch {
    return null
  }
}

export function loadLastRemoteSnapshot() {
  try {
    const userId = localStorage.getItem(LAST_REMOTE_USER_KEY)
    const snapshot = loadRemoteSnapshot(userId)
    return userId && snapshot ? { userId, snapshot } : null
  } catch {
    return null
  }
}

export function clearLastRemoteUser(userId) {
  try {
    const current = localStorage.getItem(LAST_REMOTE_USER_KEY)
    if (!userId || current === userId) localStorage.removeItem(LAST_REMOTE_USER_KEY)
  } catch {}
}

export function saveRemoteSnapshot(userId, snapshot) {
  if (!userId || !validSnapshot(snapshot)) return false
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify({
      ...snapshot,
      cachedAt: new Date().toISOString(),
    }))
    localStorage.setItem(LAST_REMOTE_USER_KEY, userId)
    return true
  } catch {
    return false
  }
}
