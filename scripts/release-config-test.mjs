import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const capacitor = JSON.parse(read('capacitor.config.json'))
const gradle = read('android/app/build.gradle')
const manifest = read('android/app/src/main/AndroidManifest.xml')
const androidStrings = read('android/app/src/main/res/values/strings.xml')
const androidStyles = read('android/app/src/main/res/values/styles.xml')
const androidActivity = read('android/app/src/main/java/app/kkiu/todo/MainActivity.java')
const androidHaptics = read('android/app/src/main/java/app/kkiu/todo/HapticsPlugin.java')
const authClient = read('app/src/services/supabaseClient.js')
const authScreen = read('app/src/components/AuthScreen.jsx')
const appSource = read('app/src/App.jsx')
const queueScreen = read('app/src/components/QueueScreen.jsx')
const queueHook = read('app/src/hooks/useFloatingQueue.js')
const styles = read('app/src/styles.css')
const interactionFeedback = read('app/src/services/interactionFeedback.js')

const checks = []
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) })

check('Capacitor package ID', capacitor.appId === 'app.kkiu.todo')
check('Gradle package ID', /applicationId\s+["']app\.kkiu\.todo["']/.test(gradle))
check('Android target SDK 36', /targetSdkVersion\s*=\s*36/.test(read('android/variables.gradle')))
check('Android version code is positive', Number(gradle.match(/versionCode\s+(\d+)/)?.[1]) > 0)
check('Native redirect declared in JS', authClient.includes("app.kkiu.todo://auth/callback"))
check('Native redirect declared in Android', androidStrings.includes('app.kkiu.todo'))
check('Native OAuth uses PKCE', authClient.includes("flowType: isNative ? 'pkce' : 'implicit'"))
check('Production auth defaults to Google only', authScreen.includes("import.meta.env.VITE_AUTH_PROVIDERS || 'google'"))
check('Password login is development-only', authScreen.includes('SHOW_PASSWORD_LOGIN = import.meta.env.DEV'))
check('Required terms fail closed', /catch\(\(error\)[\s\S]*setTermsAccepted\(false\)/.test(appSource))
check('No blocking terms loading screen', !appSource.includes('약관 동의 상태를 확인하고 있어요'))
check('Settings screen is immediately available', appSource.includes("import MoreScreen from './components/MoreScreen.jsx'"))
check('Queue movement uses an imperative track transform', queueHook.includes('trackRef.current.style.transform'))
check('Queue drag previews do not render each crossed slot', queueHook.includes('previewIndexRef') && !queueHook.match(/const previewIndex[\s\S]*?const commitIndex/)?.[0].includes('setIndexState'))
check('Queue haptics are throttled off the touch hot path', queueHook.includes('now - lastFeedbackRef.current < 48'))
check('Queue reorder always releases captured pointers', queueScreen.includes("window.addEventListener('pointercancel', end)"))
check('Queue composer stays visible during reorder recovery', styles.includes('.stage.q.reordering .queue-composer-wrap{display:block!important'))
check('Queue composer has a stable Android compositor layer', styles.includes('.queue-composer-wrap{z-index:30;pointer-events:none;transform:translateZ(0)'))
check('Android native touch haptics plugin is registered', androidActivity.includes('registerPlugin(HapticsPlugin.class)'))
check('Android haptics use View feedback instead of notification vibration', androidHaptics.includes('performHapticFeedback') && androidHaptics.includes('HapticFeedbackConstants.LONG_PRESS'))
check('Android interaction feedback selects the native haptics bridge', interactionFeedback.includes("Capacitor.getPlatform() === 'android'") && interactionFeedback.includes('NativeHaptics.perform'))
check('Android backup disabled', manifest.includes('android:allowBackup="false"'))
check('Android data extraction disabled', manifest.includes('android:dataExtractionRules="@xml/data_extraction_rules"'))
check('Android cleartext disabled', manifest.includes('android:usesCleartextTraffic="false"'))
check('Android uses a DayNight base theme', androidStyles.includes('Theme.AppCompat.DayNight.NoActionBar'))
check('Android splash has post theme', androidStyles.includes('<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>'))
check('PWA 192 icon exists', existsSync(resolve(root, 'app/public/icon-192.png')))
check('PWA 512 icon exists', existsSync(resolve(root, 'app/public/icon-512.png')))

const allPackages = { ...packageJson.dependencies, ...packageJson.devDependencies }
check(
  'Dependencies are exactly pinned',
  Object.values(allPackages).every((version) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)),
)

const collectSource = (path) => {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  if (statSync(absolute).isDirectory()) {
    return readdirSync(absolute).flatMap((entry) => collectSource(`${path}/${entry}`))
  }
  return /\.(?:html|js|jsx)$/.test(path) ? [read(path)] : []
}
const clientSource = collectSource('app').join('\n')
check('No server secret literal in client entry points', !/(service_role|sb_secret_)/i.test(clientSource))

const failed = checks.filter(({ pass }) => !pass)
console.log(JSON.stringify({ pass: failed.length === 0, checks: checks.length, failed: failed.map(({ name }) => name) }, null, 2))
if (failed.length) process.exitCode = 1
