const messageOf = (error) => String(error?.message || error || '')

export function classifySyncError(error) {
  const message = messageOf(error)
  if (/jwt.*issued.*future|issued at.*future/i.test(message)) return 'jwt-clock'
  if (/invalid input syntax for type uuid/i.test(message)) return 'invalid-uuid'
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return 'network'
  return 'other'
}

export function userFacingSyncError(error, language = 'ko') {
  const kind = classifySyncError(error)
  if (kind === 'network') return language === 'en' ? 'Connection was interrupted. Please try again.' : '연결이 잠시 끊겼어요. 다시 시도해 주세요.'
  return language === 'en' ? 'Could not save. Please try again.' : '저장하지 못했어요. 다시 시도해 주세요.'
}
