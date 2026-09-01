import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getAuthRedirectUrl, requireSupabase } from '../services/supabaseClient.js'
import { hasRestoredSession } from '../services/authBootstrap.js'
import { startNativeOAuth } from '../services/nativeAuth.js'

const GOOGLE_G_LOGO = 'https://developers.google.com/static/identity/images/g-logo.png'

const PROVIDERS = [
  { id: 'google', label: 'Google 계정으로 로그인' },
]

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

  // main.jsx restores persisted auth before React mounts. App's auth listener can
  // still attach one render later, so never paint the signed-out screen while a
  // verified restored session already exists. A real SIGNED_OUT event clears the
  // bootstrap state and this screen renders normally on the next parent render.
  if (hasRestoredSession()) {
    return <div className="app-shell" aria-hidden="true" />
  }

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

      <form className="auth-social" onSubmit={signInWithPassword}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일"
          autoComplete="username"
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 16px', border: '1px solid #d8d2c8', borderRadius: 14, font: 'inherit', background: '#fff' }}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 16px', border: '1px solid #d8d2c8', borderRadius: 14, font: 'inherit', background: '#fff' }}
        />
        <button type="submit" className="auth-social-btn" disabled={disabled}>
          <span>{passwordPending ? '로그인 중…' : '이메일로 로그인'}</span>
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: '#8b857c', fontSize: 13 }}>
        <span style={{ height: 1, flex: 1, background: '#ded8ce' }} />
        <span>또는</span>
        <span style={{ height: 1, flex: 1, background: '#ded8ce' }} />
      </div>

      <div className="auth-social">
        {PROVIDERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`auth-social-btn auth-social-${id}`}
            disabled={disabled}
            onClick={() => signInWith(id)}
            style={id === 'google' ? {
              position: 'relative',
              padding: '0 12px',
              border: '1px solid #747775',
              borderRadius: 999,
              background: '#fff',
              color: '#1f1f1f',
              fontFamily: 'Roboto, Arial, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: '20px',
            } : undefined}
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
      <img
        src={GOOGLE_G_LOGO}
        width="20"
        height="20"
        alt=""
        aria-hidden="true"
        style={{ position: 'absolute', left: 12, display: 'block' }}
      />
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
