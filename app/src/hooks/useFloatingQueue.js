import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [dragY, setDragY] = useState(0)
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
  const edgeNotifiedRef = useRef(false)
  const edgeBounceTimerRef = useRef(null)

  const stopMomentum = useCallback(() => {
    if (momentumRef.current !== null) {
      cancelAnimationFrame(momentumRef.current)
      momentumRef.current = null
    }
  }, [])

  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => () => {
    window.clearTimeout(wheelTimerRef.current)
    window.clearTimeout(edgeBounceTimerRef.current)
    if (momentumRef.current !== null) cancelAnimationFrame(momentumRef.current)
  }, [])
  const notify = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(8)
  }, [])
  const pulseEdge = useCallback((edge) => {
    window.clearTimeout(edgeBounceTimerRef.current)
    setEdgePull({ edge, amount: 1 })
    edgeBounceTimerRef.current = window.setTimeout(() => setEdgePull({ edge: null, amount: 0 }), 72)
  }, [])
  const setIndex = useCallback((next) => {
    const value = clamp(typeof next === 'function' ? next(indexRef.current) : next, 0, count)
    if (value !== indexRef.current) {
      indexRef.current = value
      setIndexState(value)
      notify()
    }
  }, [count, notify])
  useEffect(() => { if (indexRef.current > count) setIndex(count) }, [count, setIndex])

  const onPointerDownCapture = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('input, textarea, select, [contenteditable="true"], [data-queue-gesture="ignore"]')) return
    stopMomentum()
    window.clearTimeout(edgeBounceTimerRef.current)
    setDragging(false)
    const current = positionsRef.current[indexRef.current] || 0
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
    setDragY(0)
    setEdgePull({ edge: null, amount: 0 })
  }, [stopMomentum])

  const onPointerMoveCapture = useCallback((event) => {
    if (!activeRef.current || pointerRef.current !== event.pointerId) return
    const totalDelta = event.clientY - startYRef.current
    if (gestureTargetRef.current?.dataset.reorderArmed === 'true') return
    if (!movedRef.current && Math.abs(totalDelta) < 9) return
    if (!movedRef.current) {
      movedRef.current = true
      if (gestureTargetRef.current) gestureTargetRef.current.dataset.queueMoved = 'true'
      suppressClickRef.current = true
      setDragging(true)
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch {}
    }
    if (event.cancelable) event.preventDefault()
    const now = performance.now()
    const elapsed = Math.max(1, now - lastTimeRef.current)
    velocityRef.current = (event.clientY - lastYRef.current) / elapsed
    lastYRef.current = event.clientY
    lastTimeRef.current = now
    const list = positionsRef.current
    const min = list[0] || 0
    const max = list[list.length - 1] || 0
    const rawPosition = startPositionRef.current - totalDelta
    const effective = clamp(rawPosition, min, max)
    const edge = rawPosition < min ? 'start' : rawPosition > max ? 'end' : null
    const amount = edge ? Math.min(1, Math.abs(rawPosition - effective) / 64) : 0
    if (amount >= 0.98 && !edgeNotifiedRef.current) {
      edgeNotifiedRef.current = true
      notify()
    }
    setEdgePull((current) => current.edge === edge && Math.abs(current.amount - amount) < 0.02 ? current : { edge, amount })
    effectivePositionRef.current = effective
    const next = nearest(list, effective)
    setIndex(next)
    setDragY((list[next] || 0) - effective)
  }, [notify, setIndex])

  // Momentum flick: decay velocity with friction so vertical swipes keep gliding
  // after release (할일/끼리/더보기 공통). Friction 0.994^ms integrates to ~166ms of
  // travel, matching the previous single 165ms projection for gentle releases.
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
        setIndex(next)
        setDragY(0)
        setDragging(false)
        momentumRef.current = null
        pulseEdge(raw < min ? 'start' : 'end')
        return
      }
      position = raw
      velocity *= Math.pow(0.994, elapsed)
      const next = nearest(list, position)
      setIndex(next)
      if (Math.abs(velocity) < 0.02) {
        momentumRef.current = null
        setDragY(0)
        setDragging(false)
        setEdgePull({ edge: null, amount: 0 })
        return
      }
      setDragY((list[next] || 0) - position)
      momentumRef.current = requestAnimationFrame(step)
    }
    stopMomentum()
    momentumRef.current = requestAnimationFrame(step)
  }, [pulseEdge, setIndex, stopMomentum])

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
      setDragY(0)
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
    setIndex(next)
    setDragY((list[next] || 0) - wheelPositionRef.current)
    setDragging(true)
    window.clearTimeout(wheelTimerRef.current)
    wheelTimerRef.current = window.setTimeout(() => {
      setIndex(nearest(positionsRef.current, wheelPositionRef.current ?? 0))
      wheelPositionRef.current = null
      setDragY(0)
      setDragging(false)
      setEdgePull({ edge: null, amount: 0 })
    }, 95)
  }, [setIndex, stopMomentum])

  const onKeyDown = useCallback((event) => {
    if (event.key === 'ArrowUp') { event.preventDefault(); setIndex(indexRef.current - 1) }
    if (event.key === 'ArrowDown') { event.preventDefault(); setIndex(indexRef.current + 1) }
    if (event.key === 'Home') { event.preventDefault(); setIndex(0) }
    if (event.key === 'End') { event.preventDefault(); setIndex(count) }
  }, [count, setIndex])

  return {
    index,
    dragY,
    dragging,
    edge: edgePull.edge,
    edgeAmount: edgePull.amount,
    setIndex,
    rowHeight,
    gestureProps: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture: finishPointer,
      onPointerCancelCapture: finishPointer,
      onClickCapture,
      onWheel,
      onKeyDown,
      tabIndex: 0,
      'aria-label': `삽입 위치 ${index + 1}`,
    },
  }
}
