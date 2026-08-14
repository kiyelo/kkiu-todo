import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const sha256 = (path) => createHash('sha256')
  .update(read(path).replace(/\r\n/g, '\n'))
  .digest('hex')

const behaviorHashes = {
  'app/src/queuePerformance.css': '6c16454aac1e7347143186a5d44d733973c953f31abc7781035dc02f05eb4c0a',
  'app/src/styles.css': 'f6e0fa10af0a3bb4fc03b2f6d4563e7d7ac94751590897c22a86d263e529b0e1',
}

const app = read('app/src/App.jsx')
const auth = read('app/src/components/AuthScreen.jsx')
const authStorage = read('app/src/services/authStorage.js')
const haptics = read('app/src/services/interactionFeedback.js')
const queue = read('app/src/hooks/useFloatingQueue.js')
const queueScreen = read('app/src/components/QueueScreen.jsx')
const taskCard = read('app/src/components/TaskCard.jsx')
const nativeComposerScroll = read('app/src/composerNativeScroll.css')
const main = read('app/src/main.jsx')
const nativeAuth = read('app/src/services/nativeAuth.js')
const supabase = read('app/src/services/supabaseClient.js')
const terms = read('app/src/services/termsRepository.js')
const theme = read('app/src/services/themePlatform.js')
const gradle = read('android/app/build.gradle')

const checks = [
  ...Object.entries(behaviorHashes).map(([path, hash]) => [`17:49 behavior preserved: ${path}`, sha256(path) === hash]),
  ['Queue uses platform scrolling', queue.includes("stage.querySelector('.qvp')") && queue.includes('handleScrollPosition')],
  ['Queue settles to the nearest slot', queue.includes('settleToNearest') && queue.includes("behavior: 'smooth'")],
  ['Floating UI uses native queue scrolling', !queue.includes('proxyGestureRef') && !queue.includes("stage.addEventListener('touchmove'") && queue.includes("--queue-scroll-top") && nativeComposerScroll.includes('.qvp::after') && nativeComposerScroll.includes('touch-action: pan-y') && main.includes("import './composerNativeScroll.css'")],
  ['Floating UI shields underlying task actions', nativeComposerScroll.includes('z-index: 20') && nativeComposerScroll.includes('.queue-composer-wrap .si') && nativeComposerScroll.includes('.queue-composer-wrap .save') && nativeComposerScroll.includes('.queue-composer-wrap .asgc')],
  ['Grip swipe can stay native before reorder arms', taskCard.includes("style={{ touchAction: 'pan-y' }}")],
  ['Armed reorder blocks native touch scrolling', taskCard.includes("document.addEventListener('touchmove', stopTouchScroll, { passive: false, capture: true })") && taskCard.includes('touchEvent.preventDefault()')],
  ['Reorder auto-scrolls near queue edges', queueScreen.includes('REORDER_EDGE_PX') && queueScreen.includes('REORDER_MAX_SCROLL_PX') && queueScreen.includes('requestAnimationFrame(runReorderAutoScroll)')],
  ['Reorder targets actual card boundaries', queueScreen.includes('readReorderRows()') && queueScreen.includes('slots.push({ to, y: item.top })') && queueScreen.includes('last.bottom')],
  ['Dragged card stays anchored to the pointer', queueScreen.includes('grabOffsetY') && queueScreen.includes('desiredTop = pointerY - current.grabOffsetY') && queueScreen.includes('baseTop = dragged.top - current.offset')],
  ['Reorder target updates while auto-scrolling', queueScreen.includes('updateReorderAt(pointerY)') && queueScreen.includes('readReorderRows()')],
  ['Queue visual track follows actual native scroll', queue.includes('setVisualPosition(scrollerRef.current.scrollTop)')],
  ['Queue emits feedback for crossed slots', queue.includes('notifyCrossedSlots') && queue.includes('interactionFeedback(8)')],
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
