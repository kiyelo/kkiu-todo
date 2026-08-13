import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { NATIVE_AUTH_REDIRECT_URL, requireSupabase } from './supabaseClient.js'

const processedUrls = new Set()

const readAuthParams = (url) => {
  const parsed = new URL(url)
  const params = new URLSearchParams(parsed.search)
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })
  return { parsed, params }
}

const isExpectedAuthCallback = (parsed) => (
  parsed.protocol === 'app.kkiu.todo:'
  && parsed.hostname === 'auth'
  && parsed.pathname === '/callback'
)

export async function completeNativeAuth(url) {
  if (!Capacitor.isNativePlatform() || !url || processedUrls.has(url)) return false

  const { parsed, params } = readAuthParams(url)
  if (!isExpectedAuthCallback(parsed)) return false
  processedUrls.add(url)

  try {
    // Never expose callback tokens or auth codes in the app's visible history.
    window.history.replaceState({}, document.title, '/')
    const authError = params.get('error_description') || params.get('error')
    if (authError) throw new Error(authError.replaceAll('+', ' '))

    const code = params.get('code')
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    let error

    if (code) {
      ({ error } = await requireSupabase().auth.exchangeCodeForSession(code))
    } else if (accessToken && refreshToken) {
      ({ error } = await requireSupabase().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }))
    } else {
      throw new Error('로그인 응답에 세션 정보가 없습니다.')
    }

    if (error) throw error
    await Browser.close().catch(() => undefined)
    window.dispatchEvent(new CustomEvent('kkiu:native-auth', { detail: { ok: true } }))
    return true
  } catch (error) {
    window.dispatchEvent(new CustomEvent('kkiu:native-auth', {
      detail: { ok: false, message: error.message || '로그인에 실패했어요.' },
    }))
    return false
  } finally {
    await Browser.close().catch(() => undefined)
  }
}

export async function initializeNativeAuth() {
  if (!Capacitor.isNativePlatform()) return

  await App.addListener('appUrlOpen', ({ url }) => {
    void completeNativeAuth(url)
  })

  const launch = await App.getLaunchUrl()
  if (launch?.url) await completeNativeAuth(launch.url)
}

export async function startNativeOAuth(provider) {
  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_AUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('로그인 주소를 만들지 못했어요.')
  await Browser.open({ url: data.url, presentationStyle: 'popover' })
}
