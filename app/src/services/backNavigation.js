import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const handlers = []
let nativeListenerStarted = false

function runTopHandler() {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    const handled = handlers[index].handler?.()
    if (handled !== false) return true
  }
  return false
}

function ensureNativeBackListener() {
  if (nativeListenerStarted || !Capacitor.isNativePlatform()) return
  nativeListenerStarted = true
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (runTopHandler()) return
    if (canGoBack) window.history.back()
    else void CapacitorApp.exitApp()
  })
}

export function registerBackHandler(handler) {
  const entry = { id: Symbol('back-handler'), handler }
  handlers.push(entry)
  ensureNativeBackListener()
  return () => {
    const index = handlers.findIndex((item) => item.id === entry.id)
    if (index >= 0) handlers.splice(index, 1)
  }
}
