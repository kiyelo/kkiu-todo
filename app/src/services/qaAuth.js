const QA_ACCOUNTS = import.meta.env.DEV ? {
  a: {
    id: 'a',
    label: 'QA A',
    email: 'qa-a@example.test',
    password: import.meta.env.VITE_QA_A_PASSWORD?.trim(),
  },
  b: {
    id: 'b',
    label: 'QA B',
    email: 'qa-b@example.test',
    password: import.meta.env.VITE_QA_B_PASSWORD?.trim(),
  },
} : {}

export function getSelectedQaAccount() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const requested = new URLSearchParams(window.location.search).get('qa')
  if (requested === 'off') return null
  return QA_ACCOUNTS[requested] || QA_ACCOUNTS.a
}

export function getQaAuthStorageKey() {
  const account = getSelectedQaAccount()
  return account ? `kkiu-auth-qa-${account.id}` : undefined
}

export function getQaUrl(accountId) {
  const url = new URL(window.location.href)
  url.searchParams.set('qa', accountId)
  return url.href
}

export function getNormalLoginUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('qa', 'off')
  return url.href
}
