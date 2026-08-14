import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { interactionFeedback } from '../services/interactionFeedback.js'

const ENTRY_SYNC_GRACE_MS = 500
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const nearest = (positions, value) => {
  let best = 0
  for (let i = 1; i < positions.length; i += 1) {
    if (Math.abs(positions[i] - value) < Math.abs(positions[best] - value)) best = i
  }
  return best
}
const stageOwnsNativeScroll = (stage) => Boolean(stage?.classList.contains('q') && !stage.classList.contains('more-queue-stage'))

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
  const scrollEndTimerRef = useRef(null)
  const settleTimerRef = useRef(null)
  const initializedRef = useRef(false)
  const programmaticRef = useRef(false)
  const fallbackScrollListenerRef = useRef(null)
  const scrollExtentRef = useRef(null)
  const stageScrollExtentRef = useRef(null)
  const lastUserIntentAtRef = useRef(0)
  const transitionRestoreFrameRef = useRef(null)
  const ariaLabel = options.ariaLabel || 'Queue position'
  const ariaValueText = options.ariaValueText?.(index + 1, count + 1) || `${index + 1} of ${count + 1}`

  const recentlyUserDriven = useCallback(() => performance.now() - lastUserIntentAtRef.current <= ENTRY_SYNC_GRACE_MS, [])

  const setVisualPosition = useCallback((position, instant = false) => {
    const stage = stageRef.current
    if (stage) stage.style.setProperty('--queue-scroll-top', `${position}px`)
    const scroller = scrollerRef.current
    if (scroller && scroller !== stage) scroller.style.setProperty('--queue-scroll-top', `${position}px`)
    const track = trackRef.current
    if (!track) return
    if (instant) {
      cancelAnimationFrame(transitionRestoreFrameRef.current)
      track.style.transition = 'none'
      track.style.transform = `translate3d(0,${-position}px,0)`
      void track.offsetHeight
      transitionRestoreFrameRef.current = requestAnimationFrame(() => {
        if (trackRef.current === track) track.style.transition = ''
        transitionRestoreFrameRef.current = null
      })
      return
    }
    track.style.transform = `translate3d(0,${-position}px,0)`
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

  const cancelMotion = useCallback(() => {
    window.clearTimeout(scrollEndTimerRef.current)
    window.clearTimeout(settleTimerRef.current)
    const scroller = scrollerRef.current
    if (scroller && programmaticRef.current) {
      const current = scroller.scrollTop
      scroller.scrollTo({ top: current, behavior: 'auto' })
      setVisualPosition(current)
    }
    programmaticRef.current = false
    setDragging(false)
  }, [setVisualPosition])

  const settleToNearest = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const current = scroller.scrollTop
    const next = nearest(positionsRef.current, current)
    const target = positionsRef.current[next] || 0
    indexRef.current = next
    setIndexState(next)
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
    if (programmaticRef.current) return
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
    programmaticRef.current = true
    if (scrollerRef.current) scrollerRef.current.scrollTop = position
    setVisualPosition(position, !recentlyUserDriven())
    requestAnimationFrame(() => { programmaticRef.current = false })
  }, [count, recentlyUserDriven, setVisualPosition])

  const setStageElement = useCallback((element) => {
    stageRef.current = element
  }, [])

  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => () => {
    window.clearTimeout(scrollEndTimerRef.current)
    window.clearTimeout(settleTimerRef.current)
    cancelAnimationFrame(transitionRestoreFrameRef.current)
  }, [])

  // QueueScreen supplies scrollerRef to .qvp during render. Only the main queue
  // replaces that owner with stage.q; More keeps its known-good qvp scroll owner.
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (stageOwnsNativeScroll(stage)) scrollerRef.current = stage
  })

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const stageOwnsScroll = stageOwnsNativeScroll(stage)
    let fallbackScroller = false
    if (stageOwnsScroll) {
      scrollerRef.current = stage
    } else if (!scrollerRef.current) {
      scrollerRef.current = stage.querySelector('.qvp')
      fallbackScroller = Boolean(scrollerRef.current)
    }
    if (!trackRef.current) trackRef.current = stage.querySelector('.qtrack')

    const scroller = scrollerRef.current
    if (stage.classList.contains('more-qstage') && scroller) {
      let extent = scroller.querySelector(':scope > .queue-scroll-extent')
      if (!extent) {
        extent = document.createElement('div')
        extent.className = 'queue-scroll-extent'
        extent.setAttribute('aria-hidden', 'true')
        Object.assign(extent.style, {
          width: '1px',
          opacity: '0',
          pointerEvents: 'none',
          flex: 'none',
        })
        scroller.prepend(extent)
      }
      scrollExtentRef.current = extent
      const maxPosition = positionsRef.current[positionsRef.current.length - 1] || 0
      extent.style.height = `${Math.ceil(scroller.clientHeight + maxPosition)}px`
    }

    if (stageOwnsScroll) {
      let extent = stage.querySelector(':scope > .queue-stage-scroll-extent')
      if (!extent) {
        extent = document.createElement('div')
        extent.className = 'queue-stage-scroll-extent'
        extent.setAttribute('aria-hidden', 'true')
        Object.assign(extent.style, {
          width: '1px',
          opacity: '0',
          pointerEvents: 'none',
        })
        stage.append(extent)
      }
      stageScrollExtentRef.current = extent
      const maxPosition = positionsRef.current[positionsRef.current.length - 1] || 0
      extent.style.height = `${Math.ceil(maxPosition)}px`
    }

    if ((fallbackScroller || stageOwnsScroll) && scroller) {
      const listener = () => {
        if (!initializedRef.current) return
        handleScrollPosition(scroller.scrollTop)
      }
      fallbackScrollListenerRef.current = listener
      scroller.addEventListener('scroll', listener, { passive: true })
    }

    const onUserIntent = () => {
      lastUserIntentAtRef.current = performance.now()
      if (programmaticRef.current) cancelMotion()
      window.clearTimeout(scrollEndTimerRef.current)
      window.clearTimeout(settleTimerRef.current)
    }

    stage.addEventListener('pointerdown', onUserIntent, { passive: true })
    stage.addEventListener('wheel', onUserIntent, { passive: true })

    return () => {
      if ((fallbackScroller || stageOwnsScroll) && scroller && fallbackScrollListenerRef.current) {
        scroller.removeEventListener('scroll', fallbackScrollListenerRef.current)
      }
      if (scrollExtentRef.current?.parentNode) scrollExtentRef.current.remove()
      scrollExtentRef.current = null
      if (stageScrollExtentRef.current?.parentNode) stageScrollExtentRef.current.remove()
      stageScrollExtentRef.current = null
      stage.removeEventListener('pointerdown', onUserIntent)
      stage.removeEventListener('wheel', onUserIntent)
    }
  }, [cancelMotion, handleScrollPosition])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (stageOwnsNativeScroll(stage)) scrollerRef.current = stage
    const value = clamp(indexRef.current, 0, count)
    const position = positionsRef.current[value] || 0
    if (scrollerRef.current) {
      programmaticRef.current = true
      scrollerRef.current.scrollTop = position
    }
    if (stage?.classList.contains('more-qstage') && scrollExtentRef.current && scrollerRef.current) {
      const maxPosition = positionsRef.current[positionsRef.current.length - 1] || 0
      scrollExtentRef.current.style.height = `${Math.ceil(scrollerRef.current.clientHeight + maxPosition)}px`
    }
    if (stageOwnsNativeScroll(stage) && stageScrollExtentRef.current) {
      const maxPosition = positionsRef.current[positionsRef.current.length - 1] || 0
      stageScrollExtentRef.current.style.height = `${Math.ceil(maxPosition)}px`
    }
    setVisualPosition(position, !recentlyUserDriven())
    initializedRef.current = true
    requestAnimationFrame(() => { programmaticRef.current = false })
  }, [count, positionsKey, recentlyUserDriven, setVisualPosition])

  useLayoutEffect(() => {
    if (!dragging || !scrollerRef.current) return
    setVisualPosition(scrollerRef.current.scrollTop)
  }, [dragging, index, setVisualPosition])

  const onKeyDown = useCallback((event) => {
    lastUserIntentAtRef.current = performance.now()
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
