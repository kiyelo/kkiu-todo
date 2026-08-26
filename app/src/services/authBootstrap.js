let restoredSession

export function setRestoredSession(session) {
  restoredSession = session ?? null
  return restoredSession
}

export function getRestoredSession() {
  return restoredSession
}

export function hasRestoredSession() {
  return Boolean(restoredSession)
}
