import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

const NativeTheme = registerPlugin('KkiuTheme')
const systemMedia = window.matchMedia('(prefers-color-scheme: dark)')

const normalizePreference = (preference) => ['system', 'light', 'dark'].includes(preference) ? preference : 'system'

const readSystemTheme = async () => {
  if (Capacitor.getPlatform() === 'android') {
    try {
      const { theme } = await NativeTheme.getSystemTheme()
      if (theme === 'dark' || theme === 'light') return theme
    } catch {}
  }
  return systemMedia.matches ? 'dark' : 'light'
}

const syncNativeThemePreference = async (preference) => {
  if (Capacitor.getPlatform() !== 'android') return null
  try {
    return await NativeTheme.setThemePreference({ preference })
  } catch {
    return null
  }
}

const setSystemBarTheme = async (resolvedTheme) => {
  if (!Capacitor.isNativePlatform()) return
  if (Capacitor.getPlatform() === 'android') {
    await NativeTheme.setStatusBarTheme({ theme: resolvedTheme }).catch(() => undefined)
    return
  }
  await StatusBar.setStyle({
    style: resolvedTheme === 'dark' ? Style.Light : Style.Dark,
  }).catch(() => undefined)
}

const applyResolvedTheme = async (preference, resolvedTheme) => {
  const root = document.documentElement
  root.dataset.theme = resolvedTheme
  root.dataset.themePreference = preference
  root.style.colorScheme = resolvedTheme === 'light' ? 'only light' : 'dark'
  try { localStorage.setItem('kkiu-theme-preference', preference) } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    resolvedTheme === 'dark' ? '#0d1015' : '#f2f5fa',
  )
  await setSystemBarTheme(resolvedTheme)
  return resolvedTheme
}

// This is the only path allowed to write Android's app-local night mode.
// It runs once when the saved/user-selected preference changes.
export async function applyThemePreference(preference) {
  const normalized = normalizePreference(preference)
  const nativeResult = await syncNativeThemePreference(normalized)
  const nativeTheme = nativeResult?.theme
  const resolvedTheme = normalized === 'system'
    ? (nativeTheme === 'dark' || nativeTheme === 'light' ? nativeTheme : await readSystemTheme())
    : normalized
  return applyResolvedTheme(normalized, resolvedTheme)
}

// Configuration/resume/media refreshes are intentionally read-only. Calling
// setThemePreference from here would feed a native configuration event back
// into another native write.
const refreshThemePreference = async (preference, eventTheme) => {
  const normalized = normalizePreference(preference)
  const resolvedTheme = normalized === 'system'
    ? (eventTheme === 'dark' || eventTheme === 'light' ? eventTheme : await readSystemTheme())
    : normalized
  return applyResolvedTheme(normalized, resolvedTheme)
}

export function watchThemePreference(preference) {
  let disposed = false
  const refresh = (eventTheme) => { if (!disposed) void refreshThemePreference(preference, eventTheme) }
  const onMediaChange = () => { if (preference === 'system') refresh() }
  systemMedia.addEventListener('change', onMediaChange)

  let appStateHandle
  let nativeThemeHandle
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) refresh()
    }).then((handle) => {
      if (disposed) void handle.remove()
      else appStateHandle = handle
    })

    if (Capacitor.getPlatform() === 'android') {
      void NativeTheme.addListener('systemThemeChanged', ({ theme }) => {
        if (preference === 'system') refresh(theme)
      }).then((handle) => {
        if (disposed) void handle.remove()
        else nativeThemeHandle = handle
      })
    }
  }

  // Apply the persisted/user-selected native preference exactly once for this
  // preference value. Subsequent configuration events use refresh() above.
  void applyThemePreference(preference)

  return () => {
    disposed = true
    systemMedia.removeEventListener('change', onMediaChange)
    void appStateHandle?.remove()
    void nativeThemeHandle?.remove()
  }
}
