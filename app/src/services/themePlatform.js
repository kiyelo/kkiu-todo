import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

const NativeTheme = registerPlugin('KkiuTheme')
const systemMedia = window.matchMedia('(prefers-color-scheme: dark)')

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
  if (Capacitor.getPlatform() !== 'android') return
  await NativeTheme.setThemePreference({ preference }).catch(() => undefined)
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

export async function applyThemePreference(preference) {
  const normalized = ['system', 'light', 'dark'].includes(preference) ? preference : 'system'
  const resolvedTheme = normalized === 'system' ? await readSystemTheme() : normalized
  const root = document.documentElement

  root.dataset.theme = resolvedTheme
  root.dataset.themePreference = normalized
  root.style.colorScheme = resolvedTheme === 'light' ? 'only light' : 'dark'
  try { localStorage.setItem('kkiu-theme-preference', normalized) } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    resolvedTheme === 'dark' ? '#0d1015' : '#f2f5fa',
  )

  // Android 12+ renders the system splash before WebView/React exists. Keep
  // Android's persisted app night mode aligned with Kkiu's own preference so
  // the next cold start uses the same light/dark launch resource.
  await syncNativeThemePreference(normalized)
  await setSystemBarTheme(resolvedTheme)
  return resolvedTheme
}

export function watchThemePreference(preference) {
  let disposed = false
  const refresh = () => { void applyThemePreference(preference) }
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
      void NativeTheme.addListener('systemThemeChanged', () => {
        if (preference === 'system') refresh()
      }).then((handle) => {
        if (disposed) void handle.remove()
        else nativeThemeHandle = handle
      })
    }
  }

  refresh()
  return () => {
    disposed = true
    systemMedia.removeEventListener('change', onMediaChange)
    void appStateHandle?.remove()
    void nativeThemeHandle?.remove()
  }
}
