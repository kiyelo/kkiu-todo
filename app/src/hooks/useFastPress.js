import { useCallback, useRef } from 'react'

const MOVE_TOLERANCE_PX = 10

export default function useFastPress() {
  const touch = useRef(null)
  const suppressUntil = useRef(0)

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
      suppressUntil.current = performance.now() + 620
      if (!current.cancelled) action?.()
    },
    onPointerCancel: (event) => {
      const current = touch.current
      if (!current || current.pointerId !== event.pointerId) return
      try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {}
      touch.current = null
      suppressUntil.current = performance.now() + 620
    },
    onClick: (event) => {
      if (performance.now() < suppressUntil.current) { event.preventDefault(); event.stopPropagation(); return }
      action?.()
    },
  }), [])
}
