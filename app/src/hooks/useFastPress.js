import { useCallback, useRef } from 'react'

const MOVE_TOLERANCE_PX = 10
const SYNTHETIC_CLICK_WINDOW_MS = 620

let suppressSyntheticClickUntil = 0
let globalGuardInstalled = false

const armSyntheticClickGuard = () => {
  suppressSyntheticClickUntil = performance.now() + SYNTHETIC_CLICK_WINDOW_MS
}

const ensureGlobalClickGuard = () => {
  if (globalGuardInstalled || typeof document === 'undefined') return
  globalGuardInstalled = true

  // A genuinely new pointer gesture should never be blocked by the previous one.
  document.addEventListener('pointerdown', () => {
    if (performance.now() < suppressSyntheticClickUntil) suppressSyntheticClickUntil = 0
  }, true)

  // Android WebView can synthesize a delayed click at the same screen coordinate
  // after pointerup. If the original button caused a render/navigation, that click
  // may land on a newly mounted button. Consume exactly that trailing click before
  // it reaches React or the replacement element.
  document.addEventListener('click', (event) => {
    if (performance.now() >= suppressSyntheticClickUntil) return
    suppressSyntheticClickUntil = 0
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
  }, true)
}

ensureGlobalClickGuard()

export default function useFastPress() {
  const touch = useRef(null)

  return useCallback((action) => ({
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse') return
      event.preventDefault(); event.stopPropagation()
      touch.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        cancelled: false,
      }
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch {}
    },
    onPointerMove: (event) => {
      const current = touch.current
      if (!current || current.pointerId !== event.pointerId) return
      if (Math.max(Math.abs(event.clientX - current.x), Math.abs(event.clientY - current.y)) > MOVE_TOLERANCE_PX) current.cancelled = true
    },
    onPointerUp: (event) => {
      const current = touch.current
      if (!current || current.pointerId !== event.pointerId) return
      event.preventDefault(); event.stopPropagation()
      try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {}
      touch.current = null
      armSyntheticClickGuard()
      if (!current.cancelled) action?.()
    },
    onPointerCancel: (event) => {
      const current = touch.current
      if (!current || current.pointerId !== event.pointerId) return
      try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {}
      touch.current = null
      armSyntheticClickGuard()
    },
    onClick: () => {
      action?.()
    },
  }), [])
}
