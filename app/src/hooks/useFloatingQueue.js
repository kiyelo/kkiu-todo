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

  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => () => window.clearTimeout(wheelTimerRef.current), [])
  const notify = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(8)
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
    setDragY(0)
  }, [])

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
    const effective = clamp(startPositionRef.current - totalDelta, min, max)
    effectivePositionRef.current = effective
    const next = nearest(list, effective)
    setIndex(next)
    setDragY((list[next] || 0) - effective)
  }, [setIndex])

  const finishPointer = useCallback((event) => {
    if (!activeRef.current || (event && pointerRef.current !== event.pointerId)) return
    const wasMoved = movedRef.current
    const list = positionsRef.current
    if (wasMoved) {
      const min = list[0] || 0
      const max = list[list.length - 1] || 0
      const projected = clamp(effectivePositionRef.current - velocityRef.current * 165, min, max)
      setIndex(nearest(list, projected))
    }
    activeRef.current = false
    pointerRef.current = null
    movedRef.current = false
    if (gestureTargetRef.current) { gestureTargetRef.current.dataset.queueMoved = 'false'; gestureTargetRef.current.dataset.reorderArmed = 'false' }
    gestureTargetRef.current = null
    velocityRef.current = 0
    setDragY(0)
    setDragging(false)
    try { event?.currentTarget?.releasePointerCapture(event.pointerId) } catch {}
    if (wasMoved) window.setTimeout(() => { suppressClickRef.current = false }, 0)
  }, [setIndex])

  const onClickCapture = useCallback((event) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const onWheel = useCallback((event) => {
    if (Math.abs(event.deltaY) < 2) return
    event.preventDefault()
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
    }, 95)
  }, [setIndex])

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
