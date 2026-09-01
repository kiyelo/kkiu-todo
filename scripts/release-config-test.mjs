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
const androidLaunchLight = read('android/app/src/main/res/values/launch_colors.xml')
const androidLaunchDark = read('android/app/src/main/res/values-night/launch_colors.xml')
const androidActivity = read('android/app/src/main/java/app/kkiu/todo/MainActivity.java')
const androidThemePlugin = read('android/app/src/main/java/app/kkiu/todo/ThemePlugin.java')
const androidHaptics = read('android/app/src/main/java/app/kkiu/todo/HapticsPlugin.java')
const authClient = read('app/src/services/supabaseClient.js')
const authScreen = read('app/src/components/AuthScreen.jsx')
const appSource = read('app/src/App.jsx')
const mainEntry = read('app/src/main.jsx')
const appHtml = read('app/index.html')
const runtimeStyles = read('app/src/styles/index.css')
const themePlatform = read('app/src/services/themePlatform.js')
const pwaManifest = JSON.parse(read('app/public/manifest.webmanifest'))
const queueScreen = read('app/src/components/QueueScreen.jsx')
const queueHook = read('app/src/hooks/useFloatingQueue.js')
const taskCard = read('app/src/components/TaskCard.jsx')
const queueStyles = read('app/src/styles/queue.css')
const highlightStyles = read('app/src/styles/taskHighlight.css')
const interactionFeedback = read('app/src/services/interactionFeedback.js')
const androidWorkflow = read('.github/workflows/android.yml')

const checks = []
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) })

// Packaging and platform release configuration.
check('Capacitor package ID', capacitor.appId === 'app.kkiu.todo')
check('Gradle package ID', /applicationId\s+["']app\.kkiu\.todo["']/.test(gradle))
check('Android target SDK 36', /targetSdkVersion\s*=\s*36/.test(read('android/variables.gradle')))
check('Android version code is positive', Number(gradle.match(/versionCode\s+(\d+)/)?.[1]) > 0)
check('Android backup disabled', manifest.includes('android:allowBackup="false"'))
check('Android data extraction disabled', manifest.includes('android:dataExtractionRules="@xml/data_extraction_rules"'))
check('Android cleartext disabled', manifest.includes('android:usesCleartextTraffic="false"'))
check('Android uses a DayNight base theme', androidStyles.includes('Theme.AppCompat.DayNight.NoActionBar'))
check('Android splash has post theme', androidStyles.includes('<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>'))
check('Android launch uses one adaptive color resource', androidStyles.includes('@color/kkiu_launch_background') && androidLaunchLight.includes('#F2F5FA') && androidLaunchDark.includes('#0D1015'))
check('Android WebView uses adaptive launch color before first paint', androidActivity.includes('getWebView().setBackgroundColor(launchBackgroundColor())'))
check('Android 12+ theme preference uses UiModeManager app override', androidThemePlugin.includes('manager.setApplicationNightMode(applicationNightMode(preference))'))
check('Android System mode clears the app-local night override', androidThemePlugin.includes('return UiModeManager.MODE_NIGHT_AUTO'))
check('Android 12+ theme path returns before AppCompat fallback', androidThemePlugin.includes('manager.setApplicationNightMode(applicationNightMode(preference));\n            return;') && androidThemePlugin.includes('AppCompatDelegate.setDefaultNightMode(appCompatMode(preference))'))
check('System theme read uses global night mode with resolved fallback', androidThemePlugin.includes('manager.getNightMode()') && androidThemePlugin.includes('Resources.getSystem().getConfiguration()'))
check('Native preference is written from one JS call site only', (themePlatform.match(/NativeTheme\.setThemePreference/g) || []).length === 1)
check('System configuration refresh is read-only', themePlatform.includes('const refreshThemePreference') && themePlatform.includes("if (preference === 'system') refresh(theme)") && !themePlatform.includes("NativeTheme.addListener('systemThemeChanged', () => {\n        if (preference === 'system') void applyThemePreference"))
check('Android status bar icon contrast follows resolved app theme', androidThemePlugin.includes('setAppearanceLightStatusBars("light".equals(theme))') && androidThemePlugin.includes('setStatusBarTheme') && themePlatform.includes('NativeTheme.setStatusBarTheme'))
check('Legacy beige bootstrap shell cannot cover the launch surface', runtimeStyles.includes('.app-shell { background: transparent; }'))
check('Capacitor does not override launch with a fixed color', !Object.hasOwn(capacitor, 'backgroundColor'))
check('Web first paint matches light and dark app backgrounds', appHtml.includes('background: #f2f5fa') && appHtml.includes('background: #0d1015'))
check('PWA light launch color matches app background', pwaManifest.background_color === '#f2f5fa' && pwaManifest.theme_color === '#f2f5fa')
check('PWA 192 icon exists', existsSync(resolve(root, 'app/public/icon-192.png')))
check('PWA 512 icon exists', existsSync(resolve(root, 'app/public/icon-512.png')))

// Authentication and consent behavior that exists in the current shipping source.
check('Native redirect declared in JS', authClient.includes("app.kkiu.todo://auth/callback"))
check('Native redirect declared in Android', androidStrings.includes('app.kkiu.todo'))
check('Native OAuth uses PKCE', authClient.includes("flowType: isNative ? 'pkce' : 'implicit'"))
check('Google OAuth remains available', authScreen.includes("{ id: 'google'") && authScreen.includes('signInWithOAuth'))
check('Native OAuth uses the native bridge', authScreen.includes('Capacitor.isNativePlatform()') && authScreen.includes('startNativeOAuth(provider)'))
check('Auth screen exposes Google only', !authScreen.includes('signInWithPassword') && !authScreen.includes('type="password"') && !authScreen.includes('pendingInvite') && authScreen.includes('auth-google-button'))
check('Cached app mounts before auth network restoration', !mainEntry.includes('await restoreInitialSession()') && !mainEntry.includes("from './services/supabaseClient.js'"))
check('Cached session restore never renders login until auth confirms signed out', appSource.includes('if (hasSupabaseConfig && session === null) return <AuthScreen pendingInvite={pendingInvite} />') && appSource.includes('const restoringCachedSession = hasSupabaseConfig && session === undefined && Boolean(initialRemote)'))
check('Required terms preserve a valid cached acceptance on read failure', appSource.includes('setTermsAccepted(cached ? true : false)'))
check('No blocking terms loading screen', !appSource.includes('약관 동의 상태를 확인하고 있어요'))
check('Settings screen is immediately available', appSource.includes("import MoreScreen from './components/MoreScreen.jsx'"))

// Queue interaction invariants. These checks describe behavior, not old implementation names.
check('Queue movement uses an imperative track transform', queueHook.includes('track.style.transform = `translate3d('))
check('Queue index follows the nearest native scroll slot', queueHook.includes('updateIndexFromScroll') && queueHook.includes('nearest(positionsRef.current, position)') && queueHook.includes('setIndexState(next)'))
check('Queue haptics fire once for every crossed slot', queueHook.includes('notifyCrossedSlots') && queueHook.includes('for (let i = 0; i < distance; i += 1) interactionFeedback(8)'))
check('Queue reorder releases captured pointers', taskCard.includes('releasePointerCapture(event.pointerId)'))
check('Queue reorder blocks touch scrolling only after arming', taskCard.includes('state.armed = true') && taskCard.includes('touchEvent.preventDefault()'))
check('Queue composer is intentionally hidden during active reorder', queueScreen.includes('{!reorder && <div className="queue-floating-layer queue-composer-wrap"'))
check('Queue floating controls share native pan-y ownership', queueStyles.includes('.queue-floating-layer > .slotwrap') && queueStyles.includes('touch-action: pan-y'))
check('Queue text input stays input-owned', queueStyles.includes('.queue-floating-layer .si') && queueStyles.includes('touch-action: none'))
check('Queue reorder release is immediate', queueStyles.includes('.stage.q:not(.reordering) .queue-task-row') && queueStyles.includes('transition: none !important'))
const taskHighlightChangesSurfaceOrGeometry = /\bfilter\s*:|\btransform\s*:|\btranslate\s*:|background\s*:\s*(?:#fff(?:fff)?\b|rgba?\(\s*255\s*,\s*255\s*,\s*255|var\(--surface\))/.test(highlightStyles)
check('Task target highlights never brighten or move card surfaces', !taskHighlightChangesSurfaceOrGeometry)

// Native haptics use touch-class vibration and respect the system haptics setting.
check('Android native haptics plugin is registered', androidActivity.includes('registerPlugin(HapticsPlugin.class)'))
check('Android haptics use touch vibration effects', androidHaptics.includes('VibrationEffect') && androidHaptics.includes('VibrationAttributes.USAGE_TOUCH'))
check('Android haptics respect system touch-feedback setting', androidHaptics.includes('Settings.System.HAPTIC_FEEDBACK_ENABLED'))
check('Android interaction feedback selects the native haptics bridge', interactionFeedback.includes("Capacitor.getPlatform() === 'android'") && interactionFeedback.includes('NativeHaptics.perform'))

// CI and dependency reproducibility.
check('Android CI restores a stable signing key from secrets', androidWorkflow.includes('ANDROID_SIGNING_KEY_BASE64') && androidWorkflow.includes('Restore stable Android signing key'))
check('Android CI rejects an unexpected signing certificate', androidWorkflow.includes('Verify stable APK signature') && androidWorkflow.includes('0de41bf747834b849eb3ab63770cfdfc6abc8ee3ba90b37fa14501a5c2f99f47'))

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
