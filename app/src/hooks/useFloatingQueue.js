import { useCallback, useEffect, useRef, useState } from 'react'
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
export default function useFloatingQueue(count, initialIndex = count, options = {}) {
  const rowHeight = options.rowHeight || 80
  const [index, setIndexState] = useState(() => clamp(initialIndex, 0, count))
  const [dragY, setDragY] = useState(0), [dragging, setDragging] = useState(false)
  const indexRef = useRef(index), active = useRef(false), pointer = useRef(null), startY = useRef(0), lastY = useRef(0), lastTime = useRef(0), velocity = useRef(0), drag = useRef(0), wheelTimer = useRef(null)
  useEffect(() => { indexRef.current = index }, [index])
  const setIndex = useCallback((next) => { const value = clamp(typeof next === 'function' ? next(indexRef.current) : next, 0, count); if (value !== indexRef.current) { indexRef.current = value; setIndexState(value); navigator.vibrate?.(8) } }, [count])
  useEffect(() => { if (indexRef.current > count) setIndex(count) }, [count, setIndex])
  const onPointerDown = useCallback((e) => { if (e.pointerType === 'mouse' && e.button !== 0 || e.target.closest('button,input,textarea,a,label,[role="button"]')) return; active.current = true; pointer.current = e.pointerId; startY.current = lastY.current = e.clientY; lastTime.current = performance.now(); velocity.current = drag.current = 0; setDragY(0); setDragging(true); try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} }, [])
  const onPointerMove = useCallback((e) => { if (!active.current || pointer.current !== e.pointerId) return; const now = performance.now(), elapsed = Math.max(1, now - lastTime.current); velocity.current = (e.clientY - lastY.current) / elapsed; lastY.current = e.clientY; lastTime.current = now; drag.current = e.clientY - startY.current; setDragY(drag.current) }, [])
  const finish = useCallback((e) => { if (!active.current) return; active.current = false; const steps = Math.round(-(drag.current + velocity.current * 165) / rowHeight); setIndex(indexRef.current + steps); drag.current = 0; setDragY(0); setDragging(false); try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {} }, [rowHeight, setIndex])
  const onWheel = useCallback((e) => { e.preventDefault(); window.clearTimeout(wheelTimer.current); drag.current = clamp(drag.current - e.deltaY, -rowHeight * 1.4, rowHeight * 1.4); setDragY(drag.current); setDragging(true); wheelTimer.current = window.setTimeout(() => { setIndex(indexRef.current + (e.deltaY > 0 ? 1 : -1)); drag.current = 0; setDragY(0); setDragging(false) }, 95) }, [rowHeight, setIndex])
  const onKeyDown = useCallback((e) => { if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(indexRef.current - 1) } if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(indexRef.current + 1) } if (e.key === 'Home') setIndex(0); if (e.key === 'End') setIndex(count) }, [count, setIndex])
  return { index, dragY, dragging, setIndex, rowHeight, gestureProps: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onWheel, onKeyDown, tabIndex: 0, 'aria-label': `삽입 위치 ${index + 1}` } }
}
