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
  const positions = options.positions?.length === count + 1
    ? options.positions
    : Array.from({ length: count + 1 }, (_, i) => i * rowHeight)
  const positionsKey = positions.join('|')
  const positionsRef = useRef(positions)
  positionsRef.current = positions

  const [index, setIndexState] = useState(() => clamp(initialIndex, 0, count))
  const [dragging, setDragging] = useState(false)
  const indexRef = useRef(index)
  const scrollerRef = useRef(null)
  const trackRef = useRef(null)
  const scrollEndTimerRef = useRef(null)
  const initializedRef = useRef(false)
  const programmaticRef = useRef(false)
  const ariaLabel = options.ariaLabel || 'Queue position'
  const ariaValueText = options.ariaValueText?.(index + 1, count + 1) || `${index + 1} of ${count + 1}`

  const setVisualPosition = useCallback((position) => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(0,${-position}px,0)`
  }, [])

  const notifyCrossedSlots = useCallback((from, to) => {
    const distance = Math.abs(to - from)
    for (let i = 0; i < distance; i += 1) interactionFeedback(8)
  }, [])

  const updateIndexFromScroll = useCallback((position) => {
    const next = nearest(positionsRef.current, position)
    if (next === indexRef.current) return
    const previous = indexRef.current
    indexRef.current = next
    setIndexState(next)
    if (!programmaticRef.current) notifyCrossedSlots(previous, next)
  }, [notifyCrossedSlots])

  const setIndex = useCallback((next) => {
    const value = clamp(typeof next === 'function' ? next(indexRef.current) : next, 0, count)
    const previous = indexRef.current
    indexRef.current = value
    if (value !== previous) setIndexState(value)
    const position = positionsRef.current[value] || 0
    programmaticRef.current = true
    if (scrollerRef.current) scrollerRef.current.scrollTop = position
    setVisualPosition(position)
    requestAnimationFrame(() => { programmaticRef.current = false })
  }, [count, setVisualPosition])

  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => () => window.clearTimeout(scrollEndTimerRef.current), [])

  useLayoutEffect(() => {
    const value = clamp(indexRef.current, 0, count)
    const position = positionsRef.current[value] || 0
    if (scrollerRef.current) {
      programmaticRef.current = true
      scrollerRef.current.scrollTop = position
    }
    setVisualPosition(position)
    initializedRef.current = true
    requestAnimationFrame(() => { programmaticRef.current = false })
  }, [count, positionsKey, setVisualPosition])

  const onScroll = useCallback((event) => {
    if (!initializedRef.current) return
    const position = event.currentTarget.scrollTop
    setVisualPosition(position)
    updateIndexFromScroll(position)
    setDragging(true)
    window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(() => setDragging(false), 90)
  }, [setVisualPosition, updateIndexFromScroll])

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
    edge: null,
    edgeAmount: 0,
    setIndex,
    rowHeight,
    scrollerRef,
    trackRef,
    scrollProps: { onScroll },
    gestureProps: {
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
