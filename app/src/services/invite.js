const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const INVITE_STORAGE_KEY = 'kkiu-pending-invite-v1'

export function generateInviteCode() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const token = [...bytes].map((value) => ALPHABET[value % ALPHABET.length]).join('')
  return `KKIU-${token.match(/.{1,4}/g).join('-')}`
}

export function normalizeInviteCode(value = '') {
  const text = String(value).trim().toUpperCase()
  try {
    const url = new URL(text, typeof window === 'undefined' ? 'https://kkiu.invalid/' : window.location.href)
    const fromUrl = url.searchParams.get('invite')
    if (fromUrl) return normalizeInviteCode(fromUrl)
  } catch {}
  const match = text.match(/KKIU(?:-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){1,4}/)
  if (match) return match[0]
  const compact = text.replace(/[^A-Z0-9]/g, '')
  if (!compact.startsWith('KKIU') || compact.length < 8) return ''
  const body = compact.slice(4)
  return `KKIU-${body.match(/.{1,4}/g).join('-')}`
}

export function buildInviteUrl(code) {
  if (typeof window === 'undefined') return `?invite=${encodeURIComponent(code)}`
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  url.searchParams.set('invite', normalizeInviteCode(code))
  return url.href
}

export function buildInviteMessage({ code, circleName, inviterName, language = 'ko' }) {
  const normalized = normalizeInviteCode(code)
  const url = buildInviteUrl(normalized)
  if (language === 'en') return `Kkiu Todo — ${inviterName} invited you to “${circleName}”.\n${url}\nInvite code: ${normalized}`
  return `끼우 투두 — ${inviterName}님이 '${circleName}' 끼리에 초대했어요.\n${url}\n초대 코드: ${normalized}`
}

export function readPendingInvite() {
  if (typeof window === 'undefined') return ''
  const fromUrl = normalizeInviteCode(new URLSearchParams(window.location.search).get('invite') || '')
  const saved = normalizeInviteCode(localStorage.getItem(INVITE_STORAGE_KEY) || '')
  const code = fromUrl || saved
  if (code) localStorage.setItem(INVITE_STORAGE_KEY, code)
  return code
}

export function clearPendingInvite() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(INVITE_STORAGE_KEY)
  const url = new URL(window.location.href)
  url.searchParams.delete('invite')
  window.history.replaceState({}, '', url)
}

export { INVITE_STORAGE_KEY }
