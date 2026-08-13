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
  const stageRef = useRef(null)
  const scrollerRef = useRef(null)
  const trackRef = useRef(null)
  const scrollExtentRef = useRef(null)
  const scrollEndTimerRef = useRef(null)
  const settleTimerRef = useRef(null)
  const initializedRef = useRef(false)
  const programmaticRef = useRef(false)
  const fallbackScrollListenerRef = useRef(null)
  const proxyGestureRef = useRef(null)
  const proxyMomentumRef = useRef(false)
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

  const stopSettling = useCallback(() => {
    window.clearTimeout(settleTimerRef.current)
    programmaticRef.current = false
    setDragging(false)
  }, [])

  const cancelAnimatedScroll = useCallback(() => {
    window.clearTimeout(scrollEndTimerRef.current)
    window.clearTimeout(settleTimerRef.current)
    proxyMomentumRef.current = false
    programmaticRef.current = false
    const scroller = scrollerRef.current
    if (scroller) {
      const current = scroller.scrollTop
      scroller.scrollTo({ top: current, behavior: 'auto' })
      setVisualPosition(current)
      updateIndexFromScroll(current)
    }
    setDragging(false)
  }, [setVisualPosition, updateIndexFromScroll])

  const settleToNearest = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const current = scroller.scrollTop
    const next = nearest(positionsRef.current, current)
    const target = positionsRef.current[next] || 0
    indexRef.current = next
    setIndexState(next)
    proxyMomentumRef.current = false
    if (Math.abs(target - current) < 0.5) {
      setVisualPosition(target)
      stopSettling()
      return
    }
    programmaticRef.current = true
    setDragging(true)
    scroller.scrollTo({ top: target, behavior: 'smooth' })
    window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = target
        setVisualPosition(target)
      }
      stopSettling()
    }, 260)
  }, [setVisualPosition, stopSettling])

  const handleScrollPosition = useCallback((position) => {
    setVisualPosition(position)
    updateIndexFromScroll(position)
    if (programmaticRef.current || proxyMomentumRef.current) return
    setDragging(true)
    window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(settleToNearest, 110)
  }, [setVisualPosition, settleToNearest, updateIndexFromScroll])

  const onScroll = useCallback((event) => {
    if (!initializedRef.current) return
    handleScrollPosition(event.currentTarget.scrollTop)
  }, [handleScrollPosition])

  const setIndex = useCallback((next) => {
    const value = clamp(typeof next === 'function' ? next(indexRef.current) : next, 0, count)
    const previous = indexRef.current
    indexRef.current = value
    if (value !== previous) setIndexState(value)
    const position = positionsRef.current[value] || 0
    proxyMomentumRef.current = false
    programmaticRef.current = true
    if (scrollerRef.current) scrollerRef.current.scrollTop = position
    setVisualPosition(position)
    requestAnimationFrame(() => { programmaticRef.current = false })
  }, [count, setVisualPosition])

  const setStageElement = useCallback((element) => {
    stageRef.current = element
  }, [])

  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => () => {
    window.clearTimeout(scrollEndTimerRef.current)
    window.clearTimeout(settleTimerRef.current)
  }, [])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    let fallbackScroller = false
    if (!scrollerRef.current) {
      scrollerRef.current = stage.querySelector('.qvp')
      fallbackScroller = Boolean(scrollerRef.current)
    }
    if (!trackRef.current) trackRef.current = stage.querySelector('.qtrack')

    stage.querySelectorAll('.grip, .ico.grip').forEach((element) => {
      element.style.touchAction = 'pan-y'
    })

    const scroller = scrollerRef.current
    if (scroller) {
      let extent = scrollExtentRef.current
      if (!extent || extent.parentElement !== scroller) {
        extent = document.createElement('div')
        extent.setAttribute('aria-hidden', 'true')
        extent.className = 'queue-scroll-extent'
        Object.assign(extent.style, {
          width: '1px',
          opacity: '0',
          pointerEvents: 'none',
          flex: 'none',
        })
        scroller.prepend(extent)
        scrollExtentRef.current = extent
      }
      const maxPosition = positionsRef.current[positionsRef.current.length - 1] || 0
      extent.style.height = `${Math.ceil(scroller.clientHeight + maxPosition)}px`
    }

    if (fallbackScroller && scroller) {
      const listener = () => {
        if (!initializedRef.current) return
        handleScrollPosition(scroller.scrollTop)
      }
      fallbackScrollListenerRef.current = listener
      scroller.addEventListener('scroll', listener, { passive: true })
    }

    const interrupt = () => {
      if (programmaticRef.current || proxyMomentumRef.current || settleTimerRef.current) cancelAnimatedScroll()
    }

    const onTouchStart = (event) => {
      interrupt()
      const touch = event.touches?.[0]
      const target = event.target
      if (!touch || !scroller || scroller.contains(target)) return
      if (!target.closest?.('.queue-composer-wrap, .slotwrap')) return
      proxyGestureRef.current = {
        startY: touch.clientY,
        startScrollTop: scroller.scrollTop,
        lastY: touch.clientY,
        lastTime: performance.now(),
        velocity: 0,
        moved: false,
      }
    }

    const onTouchMove = (event) => {
      const gesture = proxyGestureRef.current
      const touch = event.touches?.[0]
      if (!gesture || !touch || !scroller) return
      const delta = touch.clientY - gesture.startY
      if (!gesture.moved && Math.abs(delta) < 6) return
      gesture.moved = true
      event.preventDefault()
      const now = performance.now()
      const dt = Math.max(1, now - gesture.lastTime)
      gesture.velocity = (touch.clientY - gesture.lastY) / dt
      gesture.lastY = touch.clientY
      gesture.lastTime = now
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      scroller.scrollTop = clamp(gesture.startScrollTop - delta, 0, max)
    }

    const onTouchEnd = () => {
      const gesture = proxyGestureRef.current
      proxyGestureRef.current = null
      if (!gesture?.moved || !scroller) return
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const projected = clamp(scroller.scrollTop - gesture.velocity * 150, 0, max)
      const distance = Math.abs(projected - scroller.scrollTop)
      window.clearTimeout(scrollEndTimerRef.current)
      if (distance < 8) {
        settleToNearest()
        return
      }
      proxyMomentumRef.current = true
      setDragging(true)
      scroller.scrollTo({ top: projected, behavior: 'smooth' })
      scrollEndTimerRef.current = window.setTimeout(() => {
        proxyMomentumRef.current = false
        settleToNearest()
      }, 190)
    }

    const onWheel = () => interrupt()
    const onPointerDown = () => interrupt()

    stage.addEventListener('touchstart', onTouchStart, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })
    stage.addEventListener('touchend', onTouchEnd, { passive: true })
    stage.addEventListener('touchcancel', onTouchEnd, { passive: true })
    stage.addEventListener('wheel', onWheel, { passive: true })
    stage.addEventListener('pointerdown', onPointerDown, { passive: true })

    return () => {
      if (fallbackScroller && scroller && fallbackScrollListenerRef.current) {
        scroller.removeEventListener('scroll', fallbackScrollListenerRef.current)
      }
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      stage.removeEventListener('touchcancel', onTouchEnd)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('pointerdown', onPointerDown)
      if (scrollExtentRef.current?.parentElement === scroller) scrollExtentRef.current.remove()
      scrollExtentRef.current = null
    }
  }, [cancelAnimatedScroll, handleScrollPosition, settleToNearest])

  useLayoutEffect(() => {
    const value = clamp(indexRef.current, 0, count)
    const position = positionsRef.current[value] || 0
    const scroller = scrollerRef.current
    if (scroller) {
      const maxPosition = positionsRef.current[positionsRef.current.length - 1] || 0
      if (scrollExtentRef.current) scrollExtentRef.current.style.height = `${Math.ceil(scroller.clientHeight + maxPosition)}px`
      programmaticRef.current = true
      scroller.scrollTop = position
    }
    setVisualPosition(position)
    initializedRef.current = true
    requestAnimationFrame(() => { programmaticRef.current = false })
  }, [count, positionsKey, setVisualPosition])

  useLayoutEffect(() => {
    if (!dragging || !scrollerRef.current) return
    setVisualPosition(scrollerRef.current.scrollTop)
  }, [dragging, index, setVisualPosition])

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
      ref: setStageElement,
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
