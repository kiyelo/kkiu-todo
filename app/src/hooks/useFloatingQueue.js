import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { interactionFeedback } from '../services/interactionFeedback.js'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const nearest = (positions, value) => {
  let best = 0
  for (let i = 1; i < positions.length; i += 1) {
    if (Math.abs(positions[i] - value) < Math.abs(positions[best] - value)) best = i
  }
  return best
}

export default function useFloatingQueue(count, initialIndex = count, options = {}) {
  const rowHeight = options.rowHeight || 80
  const positions = options.positions?.length === count + 1 ? options.positions : Array.from({ length: count + 1 }, (_, i) => i * rowHeight)
  const positionsRef = useRef(positions)
  positionsRef.current = positions
  const [index, setIndexState] = useState(() => clamp(initialIndex, 0, count))
  const ariaLabel = options.ariaLabel || 'Queue position'
  const ariaValueText = options.ariaValueText?.(index + 1, count + 1) || `${index + 1} of ${count + 1}`
  const [dragging, setDragging] = useState(false)
  const [edgePull, setEdgePull] = useState({ edge: null, amount: 0 })
  const indexRef = useRef(index)
  const activeRef = useRef(false)
  const pointerRef = useRef(null)
  const startYRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)
  const velocityRef = useRef(0)
  const startPositionRef = useRef(0)
  const effectivePositionRef = useRef(0)
  const movedRef = useRef(false)
  const gestureTargetRef = useRef(null)
  const suppressClickRef = useRef(false)
  const wheelPositionRef = useRef(null)
  const wheelTimerRef = useRef(null)
  const momentumRef = useRef(null)
  const trackRef = useRef(null)
  const edgeNotifiedRef = useRef(false)
  const edgeBounceTimerRef = useRef(null)
  const lastFeedbackRef = useRef(-Infinity)

  const stopMomentum = useCallback(() => {
    if (momentumRef.current !== null) {
      cancelAnimationFrame(momentumRef.current)
      momentumRef.current = null
    }
  }, [])

  const setVisualPosition = useCallback((position) => {
    effectivePositionRef.current = position
    if (trackRef.current) trackRef.current.style.transform = `translate3d(0,${-position}px,0)`
  }, [])

  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => () => {
    window.clearTimeout(wheelTimerRef.current)
    window.clearTimeout(edgeBounceTimerRef.current)
    if (momentumRef.current !== null) cancelAnimationFrame(momentumRef.current)
  }, [])
  const notify = useCallback(() => {
    const now = performance.now()
    if (now - lastFeedbackRef.current < 48) return
    lastFeedbackRef.current = now
    interactionFeedback(5)
  }, [])
  const pulseEdge = useCallback((edge) => {
    window.clearTimeout(edgeBounceTimerRef.current)
    setEdgePull({ edge, amount: 1 })
    edgeBounceTimerRef.current = window.setTimeout(() => setEdgePull({ edge: null, amount: 0 }), 72)
  }, [])
  const updateIndex = useCallback((next) => {
    const value = clamp(typeof next === 'function' ? next(indexRef.current) : next, 0, count)
    if (value !== indexRef.current) {
      indexRef.current = value
      setIndexState(value)
      notify()
    }
    return value
  }, [count, notify])
  const setIndex = useCallback((next) => {
    const value = updateIndex(next)
    setVisualPosition(positionsRef.current[value] || 0)
  }, [setVisualPosition, updateIndex])
  useEffect(() => { if (indexRef.current > count) setIndex(count) }, [count, setIndex])
  useLayoutEffect(() => {
    const position = activeRef.current || momentumRef.current !== null
      ? effectivePositionRef.current
      : (positionsRef.current[indexRef.current] || 0)
    setVisualPosition(position)
  }, [positions, setVisualPosition])

  const applyPointerMove = useCallback((pending) => {
    if (!pending || !activeRef.current || pointerRef.current !== pending.pointerId) return

    const now = pending.time
    const elapsed = Math.max(1, now - lastTimeRef.current)
    velocityRef.current = (pending.clientY - lastYRef.current) / elapsed
    lastYRef.current = pending.clientY
    lastTimeRef.current = now

    const list = positionsRef.current
    const min = list[0] || 0
    const max = list[list.length - 1] || 0
    const rawPosition = startPositionRef.current - (pending.clientY - startYRef.current)
    const effective = clamp(rawPosition, min, max)
    const edge = rawPosition < min ? 'start' : rawPosition > max ? 'end' : null
    const amount = edge ? Math.min(1, Math.abs(rawPosition - effective) / 64) : 0
    if (amount >= 0.98 && !edgeNotifiedRef.current) {
      edgeNotifiedRef.current = true
      notify()
    }
    setEdgePull((current) => current.edge === edge && Math.abs(current.amount - amount) < 0.06 ? current : { edge, amount })
    const next = nearest(list, effective)
    updateIndex(next)
    setVisualPosition(effective)
  }, [notify, setVisualPosition, updateIndex])

  const onPointerDownCapture = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('input, textarea, select, [contenteditable="true"], [data-queue-gesture="ignore"]')) return
    trackRef.current = event.currentTarget.querySelector('.qtrack')
    stopMomentum()
    window.clearTimeout(edgeBounceTimerRef.current)
    setDragging(false)
    const current = positionsRef.current[indexRef.current] || 0
    setVisualPosition(current)
    activeRef.current = true
    pointerRef.current = event.pointerId
    startYRef.current = event.clientY
    lastYRef.current = event.clientY
    lastTimeRef.current = performance.now()
    velocityRef.current = 0
    startPositionRef.current = current
    effectivePositionRef.current = current
    movedRef.current = false
    gestureTargetRef.current = event.target.closest('.grip')
    if (gestureTargetRef.current) gestureTargetRef.current.dataset.queueMoved = 'false'
    suppressClickRef.current = false
    edgeNotifiedRef.current = false
    setEdgePull({ edge: null, amount: 0 })
  }, [setVisualPosition, stopMomentum])

  const onPointerMoveCapture = useCallback((event) => {
    if (!activeRef.current || pointerRef.current !== event.pointerId) return
    const totalDelta = event.clientY - startYRef.current
    if (gestureTargetRef.current?.dataset.reorderArmed === 'true') return
    const threshold = event.pointerType === 'touch' ? 4 : 7
    if (!movedRef.current && Math.abs(totalDelta) < threshold) return
    if (!movedRef.current) {
      movedRef.current = true
      if (gestureTargetRef.current) gestureTargetRef.current.dataset.queueMoved = 'true'
      suppressClickRef.current = true
      setDragging(true)
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch {}
    }
    if (event.cancelable) event.preventDefault()
    const samples = event.nativeEvent?.getCoalescedEvents?.() || []
    const latest = samples[samples.length - 1] || event
    applyPointerMove({ pointerId: event.pointerId, clientY: latest.clientY, time: performance.now() })
  }, [applyPointerMove])

  // Momentum flick: decay velocity with friction so vertical swipes keep gliding
  // after release. Slot changes still go through setIndex(), preserving one haptic
  // tick per crossed slot while visual tracking bypasses React rendering.
  const startMomentum = useCallback((initialVelocity) => {
    let velocity = initialVelocity
    let position = effectivePositionRef.current
    let lastTime = performance.now()
    const step = (now) => {
      const list = positionsRef.current
      const min = list[0] || 0
      const max = list[list.length - 1] || 0
      const elapsed = Math.min(50, Math.max(1, now - lastTime))
      lastTime = now
      const raw = position - velocity * elapsed
      if (raw < min || raw > max) {
        position = clamp(raw, min, max)
        const next = nearest(list, position)
        updateIndex(next)
        setVisualPosition(position)
        setDragging(false)
        momentumRef.current = null
        pulseEdge(raw < min ? 'start' : 'end')
        return
      }
      position = raw
      velocity *= Math.pow(0.994, elapsed)
      const next = nearest(list, position)
      updateIndex(next)
      setVisualPosition(position)
      if (Math.abs(velocity) < 0.02) {
        momentumRef.current = null
        setIndex(next)
        setDragging(false)
        setEdgePull({ edge: null, amount: 0 })
        return
      }
      momentumRef.current = requestAnimationFrame(step)
    }
    stopMomentum()
    momentumRef.current = requestAnimationFrame(step)
  }, [pulseEdge, setIndex, setVisualPosition, stopMomentum, updateIndex])

  const finishPointer = useCallback((event) => {
    if (!activeRef.current || (event && pointerRef.current !== event.pointerId)) return
    const wasMoved = movedRef.current
    const list = positionsRef.current
    let flung = false
    if (wasMoved) {
      const stale = performance.now() - lastTimeRef.current > 90
      const releaseVelocity = stale ? 0 : velocityRef.current
      if (Math.abs(releaseVelocity) > 0.05) {
        startMomentum(releaseVelocity)
        flung = true
      } else {
        setIndex(nearest(list, effectivePositionRef.current))
      }
    }
    activeRef.current = false
    pointerRef.current = null
    movedRef.current = false
    if (gestureTargetRef.current) { gestureTargetRef.current.dataset.queueMoved = 'false'; gestureTargetRef.current.dataset.reorderArmed = 'false' }
    gestureTargetRef.current = null
    velocityRef.current = 0
    edgeNotifiedRef.current = false
    if (!flung) {
      setDragging(false)
    }
    setEdgePull({ edge: null, amount: 0 })
    try { event?.currentTarget?.releasePointerCapture(event.pointerId) } catch {}
    if (wasMoved) window.setTimeout(() => { suppressClickRef.current = false }, 0)
  }, [setIndex, startMomentum])

  const onClickCapture = useCallback((event) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const onWheel = useCallback((event) => {
    if (Math.abs(event.deltaY) < 2) return
    event.preventDefault()
    stopMomentum()
    const list = positionsRef.current
    const min = list[0] || 0
    const max = list[list.length - 1] || 0
    if (wheelPositionRef.current === null) wheelPositionRef.current = list[indexRef.current] || 0
    wheelPositionRef.current = clamp(wheelPositionRef.current + event.deltaY, min, max)
    const next = nearest(list, wheelPositionRef.current)
    updateIndex(next)
    setVisualPosition(wheelPositionRef.current)
    setDragging(true)
    window.clearTimeout(wheelTimerRef.current)
    wheelTimerRef.current = window.setTimeout(() => {
      setIndex(nearest(positionsRef.current, wheelPositionRef.current ?? 0))
      wheelPositionRef.current = null
      setDragging(false)
      setEdgePull({ edge: null, amount: 0 })
    }, 95)
  }, [setIndex, setVisualPosition, stopMomentum, updateIndex])

  const onKeyDown = useCallback((event) => {
    if (event.key === 'ArrowUp') { event.preventDefault(); setIndex(indexRef.current - 1) }
    if (event.key === 'ArrowDown') { event.preventDefault(); setIndex(indexRef.current + 1) }
    if (event.key === 'Home') { event.preventDefault(); setIndex(0) }
    if (event.key === 'End') { event.preventDefault(); setIndex(count) }
  }, [count, setIndex])

  return {
    index,
    dragY: 0,
    dragging,
    edge: edgePull.edge,
    edgeAmount: edgePull.amount,
    setIndex,
    rowHeight,
    trackRef,
    gestureProps: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture: finishPointer,
      onPointerCancelCapture: finishPointer,
      onClickCapture,
      onWheel,
      onKeyDown,
      tabIndex: 0,
      role: 'slider',
      'aria-label': ariaLabel,
      'aria-orientation': 'vertical',
      'aria-valuemin': 1,
      'aria-valuemax': count + 1,
      'aria-valuenow': index + 1,
      'aria-valuetext': ariaValueText,
    },
  }
}
