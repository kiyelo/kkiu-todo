const messageOf = (error) => String(error?.message || error || '')

export function classifySyncError(error) {
  const message = messageOf(error)
  if (error?.code === '23505' && /circle_members_active_nickname_key|NICKNAME_TAKEN/i.test(`${error?.constraint || ''} ${message}`)) return 'duplicate-circle-nickname'
  if (/jwt.*issued.*future|issued at.*future/i.test(message)) return 'jwt-clock'
  if (/invalid input syntax for type uuid/i.test(message)) return 'invalid-uuid'
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return 'network'
  return 'other'
}

export function userFacingSyncError(error, language = 'ko') {
  const kind = classifySyncError(error)
  if (kind === 'duplicate-circle-nickname') return language === 'en' ? 'That Circle nickname is already in use.' : '이 끼리에서 이미 사용 중인 프로필 이름이에요.'
  if (kind === 'network') return language === 'en' ? 'Connection was interrupted. Please try again.' : '연결이 잠시 끊겼어요. 다시 시도해 주세요.'
  return language === 'en' ? 'Could not save. Please try again.' : '저장하지 못했어요. 다시 시도해 주세요.'
}
