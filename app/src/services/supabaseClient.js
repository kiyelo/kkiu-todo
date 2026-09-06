import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { authStorage } from './authStorage.js'
import { setRestoredSession } from './authBootstrap.js'
import { getQaAuthStorageKey } from './qaAuth.js'
import { markStartupOnce } from './startupMetrics.js'

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

const startupCoreResponses = new Set()
const startupCoreRequestKey = (input, init) => {
  try {
    const rawUrl = typeof input === 'string' ? input : input?.url
    const method = (init?.method || input?.method || 'GET').toUpperCase()
    if (!rawUrl || method !== 'GET') return null
    const url = new URL(rawUrl)
    const path = url.pathname
    if (path.endsWith('/rest/v1/circles')) return 'circles'
    if (path.endsWith('/rest/v1/circle_members')) return 'circle-members'
    if (path.endsWith('/rest/v1/task_read_receipts')) return 'read-receipts'
    if (path.endsWith('/rest/v1/profiles')) return 'preferences'
    if (path.endsWith('/rest/v1/tasks')) {
      const circleFilter = url.searchParams.get('circle_id') || ''
      if (circleFilter === 'is.null') return 'personal-tasks'
      if (circleFilter === 'not.is.null') return 'circle-tasks'
    }
  } catch {}
  return null
}

const startupFetch = async (input, init) => {
  const key = startupCoreRequestKey(input, init)
  if (key) {
    markStartupOnce('supabase-core-first-request')
    markStartupOnce(`supabase-${key}-request-start`)
  }
  const response = await globalThis.fetch(input, init)
  if (key && response.ok) {
    markStartupOnce(`supabase-${key}-response`)
    startupCoreResponses.add(key)
    if (startupCoreResponses.size === 6) markStartupOnce('supabase-core-responses-ready')
  }
  return response
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey, {
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
      global: { fetch: startupFetch },
    })
  : null

export async function restoreInitialSession() {
  if (!supabase) return setRestoredSession(null)
  const { data, error } = await supabase.auth.getSession()
  return setRestoredSession(error ? null : data.session)
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === 'INITIAL_SESSION') markStartupOnce('auth-initial-session', { hasSession: Boolean(nextSession) })
    if (nextSession) {
      markStartupOnce('auth-session-ready')
      setRestoredSession(nextSession)
    } else if (event === 'SIGNED_OUT') setRestoredSession(null)
  })
}

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
