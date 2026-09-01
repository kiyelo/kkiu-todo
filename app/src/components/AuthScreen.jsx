import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getAuthRedirectUrl, requireSupabase } from '../services/supabaseClient.js'
import { hasRestoredSession } from '../services/authBootstrap.js'
import { startNativeOAuth } from '../services/nativeAuth.js'
import { getDefaultLanguage, t } from '../i18n.js'

const GOOGLE_G_LOGO = 'https://developers.google.com/static/identity/images/g-logo.png'
const PROVIDERS = [
  { id: 'google', labelKey: 'authGoogle' },
]

export default function AuthScreen({ pendingInvite = '' }) {
  const language = getDefaultLanguage()
  const googleProvider = PROVIDERS[0]
  const initialMessage = useMemo(() => {
    const values = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`)
    const errorCode = values.get('error_code')
    if (errorCode) return t(language, 'authExpired')
    return values.get('error_description')?.replaceAll('+', ' ') || ''
  }, [language])
  const [message, setMessage] = useState(initialMessage)
  const [pendingProvider, setPendingProvider] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)

  useEffect(() => {
    document.documentElement.lang = language
    const onNativeAuth = (event) => {
      if (!event.detail?.ok) {
        setMessage(event.detail?.message || t(language, 'authFailed'))
        setPendingProvider('')
      }
    }
    window.addEventListener('kkiu:native-auth', onNativeAuth)
    return () => window.removeEventListener('kkiu:native-auth', onNativeAuth)
  }, [language])

  const signInWithPassword = async (event) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setMessage(t(language, 'authMissingCredentials'))
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
      setMessage(error.message || t(language, 'authProblem'))
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
      setMessage(error.message || t(language, 'authProblem'))
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
        <p>{t(language, 'authHero')}</p>
        {pendingInvite && (
          <p className="auth-invite-hint">
            {t(language, 'authInviteSaved', pendingInvite)}
            <br />
            {t(language, 'authInviteAfterLogin')}
          </p>
        )}
      </div>

      <form className="auth-social" onSubmit={signInWithPassword}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t(language, 'authEmail')}
          autoComplete="username"
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 16px', border: '1px solid #d8d2c8', borderRadius: 14, font: 'inherit', background: '#fff' }}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t(language, 'authPassword')}
          autoComplete="current-password"
          disabled={disabled}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 16px', border: '1px solid #d8d2c8', borderRadius: 14, font: 'inherit', background: '#fff' }}
        />
        <button type="submit" className="auth-social-btn" disabled={disabled}>
          <span>{passwordPending ? t(language, 'authLoggingIn') : t(language, 'authEmailLogin')}</span>
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: '#8b857c', fontSize: 13 }}>
        <span style={{ height: 1, flex: 1, background: '#ded8ce' }} />
        <span>{t(language, 'authOr')}</span>
        <span style={{ height: 1, flex: 1, background: '#ded8ce' }} />
      </div>

      <div className="auth-social">
        <button
          type="button"
          className="auth-social-btn auth-social-google"
          disabled={disabled}
          onClick={() => signInWith(googleProvider.id)}
          style={{
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
          }}
        >
          <img
            src={GOOGLE_G_LOGO}
            width="20"
            height="20"
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', left: 12, display: 'block' }}
          />
          <span>{pendingProvider === googleProvider.id ? t(language, 'authMoving') : t(language, googleProvider.labelKey)}</span>
        </button>
      </div>
      {message && <p className="auth-message">{message}</p>}
    </div>
  )
}
