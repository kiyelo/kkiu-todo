import { useEffect, useRef, useState } from 'react'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default function useHorizontalResistance() {
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const momentum = useRef(null)
  const bounceTimer = useRef(null)
  const [pull, setPull] = useState(0)

  const stopMomentum = () => {
    if (momentum.current !== null) cancelAnimationFrame(momentum.current)
    momentum.current = null
    window.clearTimeout(bounceTimer.current)
  }

  const bounce = (direction) => {
    setPull(direction * 8)
    window.clearTimeout(bounceTimer.current)
    bounceTimer.current = window.setTimeout(() => setPull(0), 72)
  }

  const startMomentum = (scroller, initialVelocity) => {
    let velocity = initialVelocity
    let lastTime = performance.now()
    const step = (now) => {
      const elapsed = Math.min(34, Math.max(1, now - lastTime))
      lastTime = now
      const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
      const raw = scroller.scrollLeft + velocity * elapsed
      if (raw < 0 || raw > max) {
        scroller.scrollLeft = raw < 0 ? 0 : max
        momentum.current = null
        bounce(raw < 0 ? 1 : -1)
        return
      }
      scroller.scrollLeft = raw
      velocity *= Math.pow(.994, elapsed)
      if (Math.abs(velocity) < .02) { momentum.current = null; return }
      momentum.current = requestAnimationFrame(step)
    }
    stopMomentum()
    momentum.current = requestAnimationFrame(step)
  }

  const finish = (event) => {
    const current = gesture.current
    if (!current || (event && current.pointerId !== event.pointerId)) return
    gesture.current = null
    try { event?.currentTarget?.releasePointerCapture(event.pointerId) } catch {}
    if (current.mode === 'horizontal') {
      const stale = performance.now() - current.lastTime > 90
      const velocity = stale ? 0 : -current.velocity
      if (!current.pull && Math.abs(velocity) > .05) startMomentum(current.scroller, velocity)
      else setPull(0)
      window.setTimeout(() => { suppressClick.current = false }, 0)
    } else setPull(0)
  }

  useEffect(() => () => {
    if (momentum.current !== null) cancelAnimationFrame(momentum.current)
    window.clearTimeout(bounceTimer.current)
  }, [])

  return {
    style: { '--horizontal-edge-pull': `${pull}px` },
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      stopMomentum()
      gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastTime: performance.now(), velocity: 0, mode: null, pull: 0, scroller: event.currentTarget }
      suppressClick.current = false
      setPull(0)
    },
    onPointerMove: (event) => {
      const current = gesture.current
      if (!current || current.pointerId !== event.pointerId) return
      const totalX = event.clientX - current.startX
      const totalY = event.clientY - current.startY
      if (!current.mode) {
        if (Math.max(Math.abs(totalX), Math.abs(totalY)) < 6) return
        current.mode = Math.abs(totalX) > Math.abs(totalY) ? 'horizontal' : 'vertical'
        if (current.mode === 'vertical') return
        suppressClick.current = true
        try { event.currentTarget.setPointerCapture(event.pointerId) } catch {}
      }
      if (current.mode !== 'horizontal') return
      event.stopPropagation()
      if (event.cancelable) event.preventDefault()
      const now = performance.now()
      const elapsed = Math.max(1, now - current.lastTime)
      const delta = event.clientX - current.lastX
      current.velocity = delta / elapsed
      current.lastX = event.clientX
      current.lastTime = now
      const scroller = current.scroller
      const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
      const desired = scroller.scrollLeft - delta
      if (desired < 0) {
        scroller.scrollLeft = 0
        current.pull = clamp(current.pull + Math.max(0, delta) * .42, 0, 8)
      } else if (desired > max) {
        scroller.scrollLeft = max
        current.pull = clamp(current.pull + Math.min(0, delta) * .42, -8, 0)
      } else {
        scroller.scrollLeft = desired
        current.pull *= .35
      }
      setPull(current.pull)
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onClickCapture: (event) => {
      if (!suppressClick.current) return
      event.preventDefault()
      event.stopPropagation()
    },
  }
}
