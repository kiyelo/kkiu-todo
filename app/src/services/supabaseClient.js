import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { authStorage } from './authStorage.js'
import { getQaAuthStorageKey } from './qaAuth.js'
import { loadLastRemoteSnapshot } from './remoteCache.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey)
export const NATIVE_AUTH_REDIRECT_URL = 'app.kkiu.todo://auth/callback'
const isNative = Capacitor.isNativePlatform()
const projectRef = (() => {
  try { return new URL(supabaseUrl).hostname.split('.')[0] } catch { return 'kkiu' }
})()
// Keep Supabase's historical default key so sessions from older APKs migrate.
const authStorageKey = getQaAuthStorageKey() || `sb-${projectRef}-auth-token`

const stabilizeCachedInitialSession = (client) => {
  if (!client) return client
  const onAuthStateChange = client.auth.onAuthStateChange.bind(client.auth)

  client.auth.onAuthStateChange = (callback) => {
    let deferredInitialSession = false

    return onAuthStateChange((event, nextSession) => {
      const shouldConfirmCachedSession = (
        event === 'INITIAL_SESSION'
        && !nextSession
        && Boolean(loadLastRemoteSnapshot())
      )

      if (!shouldConfirmCachedSession) {
        if (nextSession || event === 'SIGNED_OUT') deferredInitialSession = false
        callback(event, nextSession)
        return
      }

      deferredInitialSession = true
      globalThis.setTimeout(async () => {
        if (!deferredInitialSession) return
        const { data, error } = await client.auth.getSession()
        if (!deferredInitialSession) return
        deferredInitialSession = false
        callback('INITIAL_SESSION', error ? null : data.session)
      }, 0)
    })
  }

  return client
}

export const supabase = hasSupabaseConfig
  ? stabilizeCachedInitialSession(createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !isNative,
        // Keep the web redirect flow unchanged, but never put access and refresh
        // tokens in a native deep-link URL. The native callback exchanges a
        // short-lived PKCE code instead.
        flowType: isNative ? 'pkce' : 'implicit',
        storage: authStorage,
        storageKey: authStorageKey,
      },
    }))
  : null

export function getAuthRedirectUrl() {
  if (typeof window === 'undefined') return undefined
  if (Capacitor.isNativePlatform()) return NATIVE_AUTH_REDIRECT_URL
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  const invite = new URLSearchParams(window.location.search).get('invite') || localStorage.getItem('kkiu-pending-invite-v1')
  if (invite) url.searchParams.set('invite', invite)
  return url.href
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase environment variables are not configured.')
  }

  return supabase
}
