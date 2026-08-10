const CACHE_PREFIX = 'kkiu-remote-cache-v1:'

const cacheKey = (userId) => `${CACHE_PREFIX}${userId}`

const validSnapshot = (value) => Boolean(
  value
  && typeof value === 'object'
  && Array.isArray(value.personal)
  && Array.isArray(value.circles)
  && value.settings
  && typeof value.settings === 'object',
)

export function loadRemoteSnapshot(userId) {
  if (!userId) return null
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey(userId)))
    return validSnapshot(value) ? value : null
  } catch {
    return null
  }
}

export function saveRemoteSnapshot(userId, snapshot) {
  if (!userId || !validSnapshot(snapshot)) return false
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify({
      ...snapshot,
      cachedAt: new Date().toISOString(),
    }))
    return true
  } catch {
    return false
  }
}
