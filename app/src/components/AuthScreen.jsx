import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getAuthRedirectUrl, requireSupabase } from '../services/supabaseClient.js'
import { startNativeOAuth } from '../services/nativeAuth.js'

const PROVIDER_CATALOG = [
  { id: 'google', label: 'Google로 계속하기' },
  { id: 'apple', label: 'Apple로 계속하기' },
  { id: 'kakao', label: 'Kakao로 계속하기' },
]
const enabledProviderIds = new Set(
  (import.meta.env.VITE_AUTH_PROVIDERS || 'google')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
const PROVIDERS = PROVIDER_CATALOG.filter(({ id }) => enabledProviderIds.has(id))
const SHOW_PASSWORD_LOGIN = import.meta.env.DEV

export default function AuthScreen({ pendingInvite = '' }) {
  const initialMessage = useMemo(() => {
    const values = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`)
    const errorCode = values.get('error_code')
    if (errorCode) return '로그인 링크가 만료됐거나 이미 사용됐어요. 다시 시도해주세요.'
    return values.get('error_description')?.replaceAll('+', ' ') || ''
  }, [])
  const [message, setMessage] = useState(initialMessage)
  const [pendingProvider, setPendingProvider] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)

  useEffect(() => {
    const onNativeAuth = (event) => {
      if (!event.detail?.ok) {
        setMessage(event.detail?.message || '로그인에 실패했어요.')
        setPendingProvider('')
      }
    }
    window.addEventListener('kkiu:native-auth', onNativeAuth)
    return () => window.removeEventListener('kkiu:native-auth', onNativeAuth)
  }, [])

  const signInWithPassword = async (event) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setMessage('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setMessage('')
    setPasswordPending(true)
    try {
      const { error } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
    } catch (error) {
      setMessage(error.message || '로그인 중 문제가 생겼어요.')
      setPasswordPending(false)
    }
  }

  const signInWith = async (provider) => {
    setMessage('')
    setPendingProvider(provider)
    try {
      if (Capacitor.isNativePlatform()) {
        await startNativeOAuth(provider)
        setPendingProvider('')
        return
      }
      const { error } = await requireSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo: getAuthRedirectUrl() },
      })
      if (error) throw error
    } catch (error) {
      setMessage(error.message || '로그인 중 문제가 생겼어요.')
      setPendingProvider('')
    }
  }

  const disabled = Boolean(pendingProvider) || passwordPending

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <span className="auth-mark">✓</span>
        <p>끼우 할 일을 가볍게 끼워 넣어요</p>
        {pendingInvite && (
          <p className="auth-invite-hint">
            끼리 초대를 보관했어요 · {pendingInvite}
            <br />
            로그인을 마치면 프로필 설정과 초대 확인 화면이 자동으로 열립니다.
          </p>
        )}
      </div>

      {SHOW_PASSWORD_LOGIN && (
        <>
          <form className="auth-social" onSubmit={signInWithPassword}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="이메일"
              aria-label="이메일"
              autoComplete="username"
              disabled={disabled}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 16px', border: '1px solid #d8d2c8', borderRadius: 14, font: 'inherit', background: '#fff' }}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              aria-label="비밀번호"
              autoComplete="current-password"
              disabled={disabled}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 16px', border: '1px solid #d8d2c8', borderRadius: 14, font: 'inherit', background: '#fff' }}
            />
            <button type="submit" className="auth-social-btn" disabled={disabled}>
              <span>{passwordPending ? '로그인 중…' : '이메일로 로그인'}</span>
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true">
            <span />
            <b>또는</b>
            <span />
          </div>
        </>
      )}

      <div className="auth-social">
        {PROVIDERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`auth-social-btn auth-social-${id}`}
            disabled={disabled}
            onClick={() => signInWith(id)}
          >
            <ProviderIcon id={id} />
            <span>{pendingProvider === id ? '이동 중…' : label}</span>
          </button>
        ))}
      </div>
      {message && <p className="auth-message">{message}</p>}
    </div>
  )
}

function ProviderIcon({ id }) {
  if (id === 'google') {
    return (
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.85 2.07-1.82 2.71v2.26h2.93c1.72-1.58 2.69-3.91 2.69-6.61z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.93-2.26c-.81.55-1.85.87-3.03.87-2.33 0-4.3-1.57-5-3.68H1v2.33C2.47 15.98 5.48 18 9 18z" />
        <path fill="#FBBC05" d="M4 10.74a5.4 5.4 0 0 1 0-3.48V4.93H1a9 9 0 0 0 0 8.14l3-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.6-2.6C13.46.89 11.43 0 9 0 5.48 0 2.02 1 4.93l3 2.33c.7-2.11 2.67-3.68 5-3.68z" />
      </svg>
    )
  }
  if (id === 'apple') {
    return (
      <svg viewBox="0 0 384 512" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.1-52.3.8-107.9 40.6-107.9 121.2 0 26.7 4.9 54.3 14.6 82.8 13 38.1 59.6 131.4 108 129.9 25.4-.7 43.3-18 76.3-18 32 0 48.5 18 76.4 18 48.8-.7 91.1-85.8 103.5-124-65.9-31-71.3-90.6-71.3-82.1zM255.1 71.4c22.4-26.6 20.4-50.9 19.7-59.4-19.8 1.1-42.8 13.6-55.9 29-14.5 16.2-23 36.5-21.1 58.9 21.3-1.6 40.6-13 57.3-28.5z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FEE500" />
      <path fill="#191600" d="M12 6.2c-4.1 0-7.4 2.6-7.4 5.9 0 2.1 1.4 4 3.5 5.1-.15.55-.55 2-.63 2.3-.1.36.13.36.28.26.12-.08 1.9-1.28 2.68-1.8.5.07 1.02.11 1.55.11 4.1 0 7.4-2.6 7.4-5.9s-3.3-5.9-7.4-5.9z" />
    </svg>
  )
}
