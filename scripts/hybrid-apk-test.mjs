import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const sha256 = (path) => createHash('sha256')
  .update(read(path).replace(/\r\n/g, '\n'))
  .digest('hex')

const behaviorHashes = {
  'app/src/components/QueueScreen.jsx': '72536dac827fcab7f136fb46df3c8b5b409a6f4e5904f338da54ac4b3f3dc749',
  'app/src/hooks/useFloatingQueue.js': '06e80b3d9456dbeb8fdb66edde3d9c22c220d9190287cdb3142f812537139905',
  'app/src/queuePerformance.css': '6c16454aac1e7347143186a5d44d733973c953f31abc7781035dc02f05eb4c0a',
  'app/src/styles.css': 'f6e0fa10af0a3bb4fc03b2f6d4563e7d7ac94751590897c22a86d263e529b0e1',
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
