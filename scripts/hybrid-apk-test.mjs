import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const sha256 = (path) => createHash('sha256')
  .update(read(path).replace(/\r\n/g, '\n'))
  .digest('hex')

const behaviorHashes = {
  'app/src/components/QueueScreen.jsx': '01eccdd971336c721bfb08284391cddeadc708aee8b266c3baee78fb80dc1d6a',
  'app/src/hooks/useFloatingQueue.js': 'd8801ad3e38da88544ff618e5403353377ecb058f1f979cee973af65d0dab5d3',
  'app/src/queuePerformance.css': '6c16454aac1e7347143186a5d44d733973c953f31abc7781035dc02f05eb4c0a',
  'app/src/styles.css': 'cde2c69bc9dba04bad07d01fa49b2dd09992c430a4221fce7401331aac25cd51',
}

const app = read('app/src/App.jsx')
const auth = read('app/src/components/AuthScreen.jsx')
const authStorage = read('app/src/services/authStorage.js')
const haptics = read('app/src/services/interactionFeedback.js')
const nativeAuth = read('app/src/services/nativeAuth.js')
const supabase = read('app/src/services/supabaseClient.js')
const terms = read('app/src/services/termsRepository.js')
const theme = read('app/src/services/themePlatform.js')
const gradle = read('android/app/build.gradle')

const checks = [
  ...Object.entries(behaviorHashes).map(([path, hash]) => [`17:49 behavior preserved: ${path}`, sha256(path) === hash]),
  ['Native PKCE auth enabled', supabase.includes("flowType: isNative ? 'pkce' : 'implicit'") && nativeAuth.includes('exchangeCodeForSession')],
  ['Native session storage enabled', authStorage.includes('Preferences.get') && supabase.includes('storage: authStorage')],
  ['Native OAuth wired without replacing the legacy login screen', auth.includes('startNativeOAuth(provider)')],
  ['Native Android haptics enabled', haptics.includes('NativeHaptics.perform')],
  ['Native theme and status bar sync enabled', theme.includes('systemThemeChanged') && app.includes('watchThemePreference')],
  ['Terms gate waits for a completed consent check', app.includes('termsAccepted === false')],
  ['Versioned per-user consent cache enabled', terms.includes('kkiu-required-terms-v1:') && terms.includes('rememberRequiredTermsAccepted')],
  ['Hybrid APK version code is 7', /versionCode\s+7/.test(gradle)],
]

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name)
console.log(JSON.stringify({ pass: failed.length === 0, checks: checks.length, failed }, null, 2))
if (failed.length) process.exit(1)
