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

export default function AuthScreen() {
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

  const disabled = Boolean(pendingProvider)

  // main.jsx restores persisted auth before React mounts. App's auth listener can
  // still attach one render later, so never paint the signed-out screen while a
  // verified restored session already exists. A real SIGNED_OUT event clears the
  // bootstrap state and this screen renders normally on the next parent render.
  if (hasRestoredSession()) {
    return <div className="app-shell" aria-hidden="true" />
  }

  return (
    <main className="auth-screen">
      <section className="auth-login-panel" aria-labelledby="auth-title">
        <div className="auth-login-brand">
          <img className="auth-app-icon" src="/icon-192.png" alt="" aria-hidden="true" />
          <h1 id="auth-title">{t(language, 'authTitle')}</h1>
          <p>{t(language, 'authHero')}</p>
        </div>

        <div className="auth-login-actions">
          <button
            type="button"
            className="auth-google-button"
            disabled={disabled}
            onClick={() => signInWith(googleProvider.id)}
          >
            <img src={GOOGLE_G_LOGO} width="20" height="20" alt="" aria-hidden="true" />
            <span>{pendingProvider === googleProvider.id ? t(language, 'authMoving') : t(language, googleProvider.labelKey)}</span>
          </button>
          {message && <p className="auth-message" role="alert">{message}</p>}
        </div>
      </section>
    </main>
  )
}
