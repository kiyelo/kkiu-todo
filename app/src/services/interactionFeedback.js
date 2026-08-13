import { Capacitor, registerPlugin } from '@capacitor/core'

let enabled = true
const NativeHaptics = registerPlugin('KkiuHaptics')

const nativeKind = (pattern) => {
  const strength = Array.isArray(pattern) ? Math.max(0, ...pattern) : Number(pattern) || 0
  if (strength >= 18) return 'longPress'
  if (strength >= 12) return 'dragStart'
  if (strength >= 9) return 'confirm'
  return 'tick'
}

export function setInteractionFeedbackEnabled(next) {
  enabled = next !== false
}

export function interactionFeedback(pattern) {
  if (!enabled) return false
  if (Capacitor.getPlatform() === 'android') {
    void NativeHaptics.perform({ kind: nativeKind(pattern) }).catch(() => undefined)
    return true
  }
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  return navigator.vibrate(pattern)
}
