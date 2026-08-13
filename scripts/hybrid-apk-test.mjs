import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const sha256 = (path) => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')

const behaviorHashes = {
  'app/src/components/QueueScreen.jsx': '88de828b8e57933db39b1ddee5a6f33cc86ec43400896cc9983819a1c972c144',
  'app/src/hooks/useFloatingQueue.js': '2b258ef263bb82fd86e59caf33ccd12b56cdc53bc66898bca46cf8e1dd66974d',
  'app/src/queuePerformance.css': '6d4d0eb7b64e7df749884a947ad248701588b2384bd01e971a3bd5b7ddc8813d',
  'app/src/styles.css': 'dfe528ae353692c8e17d520b85a1d0b6622762b778a4c2eb7e61cc8046aaddc2',
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
