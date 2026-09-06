import { Capacitor, registerPlugin } from '@capacitor/core'

const native = Capacitor.isNativePlatform()
const NativeStartupMetrics = native ? registerPlugin('KkiuStartupMetrics') : null
const marks = new Set()

const localNow = () => typeof performance === 'undefined' ? Date.now() : performance.now()

export function markStartupOnce(name, details = {}) {
  if (!name || marks.has(name)) return
  marks.add(name)
  const webMs = Math.round(localNow() * 10) / 10
  try { performance.mark?.(`kkiu:${name}`) } catch {}
  console.info('[kkiu startup]', name, { webMs, ...details })

  if (!NativeStartupMetrics) return
  void NativeStartupMetrics.mark({ name })
    .then((nativeTiming) => console.info('[kkiu startup native]', name, nativeTiming))
    .catch(() => undefined)
}

export function markStartupAfterPaint(name, details = {}) {
  if (!name || marks.has(name)) return
  requestAnimationFrame(() => requestAnimationFrame(() => markStartupOnce(name, details)))
}
