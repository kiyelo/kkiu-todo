import { useCallback, useEffect, useRef, useState } from 'react'

const ROW = 80
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default function useFloatingQueue(count, initialIndex = count) {
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
  const wheelLockRef = useRef(false)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  const notify = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8)
    }
  }, [])

  const setIndex = useCallback((next) => {
    const value = clamp(typeof next === 'function' ? next(indexRef.current) : next, 0, count)
    if (value !== indexRef.current) {
      indexRef.current = value
      setIndexState(value)
      notify()
    }
  }, [count, notify])

  useEffect(() => {
    if (indexRef.current > count) setIndex(count)
  }, [count, setIndex])

  const onPointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('button, input, textarea, a, [role="button"]')) return

    activeRef.current = true
    pointerRef.current = event.pointerId
    startYRef.current = event.clientY
    lastYRef.current = event.clientY
    lastTimeRef.current = performance.now()
    velocityRef.current = 0
    setDragY(0)
    setDragging(true)

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
  }, [])

  const onPointerMove = useCallback((event) => {
    if (!activeRef.current || pointerRef.current !== event.pointerId) return

    const now = performance.now()
    const elapsed = Math.max(1, now - lastTimeRef.current)
    const delta = event.clientY - lastYRef.current
    velocityRef.current = delta / elapsed
    lastYRef.current = event.clientY
    lastTimeRef.current = now
    setDragY(event.clientY - startYRef.current)
  }, [])

  const finishPointer = useCallback((event) => {
    if (!activeRef.current) return

    activeRef.current = false
    pointerRef.current = null

    const projected = dragY + velocityRef.current * 150
    const steps = Math.round(-projected / ROW)
    setIndex(indexRef.current + steps)
    setDragY(0)
    setDragging(false)

    if (event?.currentTarget && event?.pointerId !== undefined) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {}
    }
  }, [dragY, setIndex])

  const onWheel = useCallback((event) => {
    event.preventDefault()
    if (wheelLockRef.current || Math.abs(event.deltaY) < 4) return

    wheelLockRef.current = true
    setIndex(indexRef.current + (event.deltaY > 0 ? 1 : -1))
    window.setTimeout(() => {
      wheelLockRef.current = false
    }, 110)
  }, [setIndex])

  const onKeyDown = useCallback((event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndex(indexRef.current - 1)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIndex(indexRef.current + 1)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setIndex(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      setIndex(count)
    }
  }, [count, setIndex])

  return {
    index,
    dragY,
    dragging,
    setIndex,
    rowHeight: ROW,
    gestureProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onWheel,
      onKeyDown,
      tabIndex: 0,
      'aria-label': `할 일 삽입 위치 ${index + 1}`,
    },
  }
}
