import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowIcon, CheckIcon, GripIcon } from './Icons.jsx'
import OverflowText from './OverflowText.jsx'
import { TASK_TITLE_LIMIT, limitGraphemes, normalizeTaskTitle } from '../utils/text.js'
import { interactionFeedback } from '../services/interactionFeedback.js'

function splitAtWidth(text, width) {
  if (!width || typeof document === 'undefined') return [text, '']
  const canvas = splitAtWidth.canvas || (splitAtWidth.canvas = document.createElement('canvas'))
  const context = canvas.getContext('2d')
  context.font = '580 15.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  if (context.measureText(text).width <= width) return [text, '']
  let low = 1; let high = text.length
  while (low < high) { const middle = (low + high + 1) >> 1; if (context.measureText(text.slice(0, middle)).width <= width) low = middle; else high = middle - 1 }
  return [text.slice(0, low), text.slice(low).trim()]
}

export default function TaskCard({ task, index, members, circle, onComplete, onEdit, onAssignee, onMove, onDelete, onEditingChange, onDragStart, onDragMove, onDragEnd, dragging, reorderable = true, showRank = true, searchHit = false, newHit = false, language = 'ko' }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.title)
  const [leaving, setLeaving] = useState(false)
  const [titleWidth, setTitleWidth] = useState(0)
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [swipeReady, setSwipeReady] = useState(false)
  const [swipeLeaving, setSwipeLeaving] = useState(false)
  const input = useRef(null); const cardRef = useRef(null); const titleRef = useRef(null)
  const grip = useRef(null); const swipe = useRef(null); const suppressSwipeClick = useRef(false)

  const setEditingState = (next) => {
    setEditing(next)
    onEditingChange?.(task.id, next)
  }

  useEffect(() => { if (editing) { input.current?.focus({ preventScroll: true }); input.current?.setSelectionRange(value.length, value.length) } }, [editing])
  useLayoutEffect(() => {
    const element = titleRef.current
    if (!element) return undefined
    const measure = () => setTitleWidth(element.clientWidth)
    measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect()
  }, [editing])
  useEffect(() => { if (!editing) return undefined; const outside = (event) => { if (!cardRef.current?.contains(event.target)) { setValue(task.title); setEditingState(false) } }; document.addEventListener('pointerdown', outside, true); return () => document.removeEventListener('pointerdown', outside, true) }, [editing, task.title])
  const save = () => { const next = normalizeTaskTitle(value); if (next) onEdit(task.id, next); setEditingState(false) }

  const clearSwipe = (event) => {
    const state = swipe.current
    if (event && state?.pointerId !== event.pointerId) return
    if (state?.captured && cardRef.current) {
      try { cardRef.current.releasePointerCapture(state.pointerId) } catch {}
    }
    swipe.current = null
  }
  const resetSwipe = () => {
    setSwipeX(0)
    setSwiping(false)
    setSwipeReady(false)
    setSwipeLeaving(false)
  }
  const startSwipeDelete = (event) => {
    if (editing || task.done || dragging || swipeLeaving || event.button > 0 || event.target.closest('.grip,.ck,input,textarea,.save,.asgc')) return
    clearSwipe()
    swipe.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: false,
      captured: false,
      ready: false,
      hapticSent: false,
      offset: 0,
    }
  }
  const moveSwipeDelete = (event) => {
    const state = swipe.current
    if (!state || state.pointerId !== event.pointerId || swipeLeaving) return
    const dx = event.clientX - state.x
    const dy = event.clientY - state.y
    if (!state.active) {
      if (Math.abs(dy) >= 10 && Math.abs(dy) > Math.abs(dx) * 1.1) { clearSwipe(event); return }
      if (dx > -8 || Math.abs(dx) <= Math.abs(dy) * 1.12) return
      state.active = true
      suppressSwipeClick.current = true
      setSwiping(true)
      try { cardRef.current?.setPointerCapture(event.pointerId); state.captured = true } catch {}
    }
    event.preventDefault(); event.stopPropagation()
    const width = cardRef.current?.offsetWidth || 320
    const maxDistance = Math.max(112, width * .55)
    const next = Math.max(-maxDistance, Math.min(0, dx))
    const threshold = Math.min(120, Math.max(88, width * .3))
    const ready = Math.abs(next) >= threshold
    if (ready && !state.hapticSent) { interactionFeedback(16); state.hapticSent = true }
    state.offset = next
    state.ready = ready
    setSwipeX(next)
    setSwipeReady(ready)
  }
  const finishSwipeDelete = (event, cancelled = false) => {
    const state = swipe.current
    if (!state || state.pointerId !== event.pointerId) return
    if (!state.active) { clearSwipe(event); return }
    event.preventDefault(); event.stopPropagation()
    const shouldDelete = !cancelled && state.ready
    clearSwipe(event)
    if (shouldDelete) {
      const width = cardRef.current?.offsetWidth || 320
      setSwipeReady(true)
      setSwipeLeaving(true)
      setSwiping(false)
      setSwipeX(-(width + 48))
      window.setTimeout(() => onDelete?.(task.id), 180)
    } else {
      resetSwipe()
    }
    window.setTimeout(() => { suppressSwipeClick.current = false }, 0)
  }

  useEffect(() => () => {
    window.clearTimeout(grip.current?.timer)
    const current = grip.current
    current?.cleanupTouch?.()
    if (current?.element) { current.element.dataset.reorderArmed = 'false'; current.element.dataset.queueMoved = 'false' }
    clearSwipe()
    grip.current = null; suppressSwipeClick.current = false
  }, [])

  const startGrip = (event) => {
    if (!reorderable) return
    const element = event.currentTarget
    const state = { element, pointerId: event.pointerId, x: event.clientX, y: event.clientY, armed: false, timer: null, cleanupTouch: null }
    element.dataset.reorderArmed = 'false'; element.dataset.queueMoved = 'false'
    state.timer = window.setTimeout(() => {
      if (element.dataset.queueMoved === 'true' || grip.current !== state) return
      state.armed = true; element.dataset.reorderArmed = 'true'
      const stopTouchScroll = (touchEvent) => { if (grip.current === state && state.armed) touchEvent.preventDefault() }
      document.addEventListener('touchmove', stopTouchScroll, { passive: false, capture: true })
      state.cleanupTouch = () => document.removeEventListener('touchmove', stopTouchScroll, true)
      try { element.setPointerCapture(event.pointerId) } catch {}
      interactionFeedback(14)
      onDragStart?.(task.id, event)
    }, 170)
    grip.current = state
  }
  const moveGrip = (event) => {
    const state = grip.current
    if (!state || state.pointerId !== event.pointerId) return
    const moved = Math.max(Math.abs(event.clientX - state.x), Math.abs(event.clientY - state.y))
    if (!state.armed && moved >= 8) window.clearTimeout(state.timer)
    if (!state.armed) return
    event.preventDefault(); event.stopPropagation(); onDragMove?.(event)
  }
  const finishGrip = (event, cancelled = false) => {
    const state = grip.current
    if (!state || state.pointerId !== event.pointerId) return
    window.clearTimeout(state.timer)
    state.cleanupTouch?.()
    if (state.armed) {
      event.preventDefault(); event.stopPropagation()
      try { state.element.releasePointerCapture(event.pointerId) } catch {}
      onDragEnd?.(event, cancelled)
    }
    state.element.dataset.reorderArmed = 'false'; state.element.dataset.queueMoved = 'false'; grip.current = null
  }

  const finish = () => { if (task.done) return; interactionFeedback(10); setLeaving(true); window.setTimeout(() => { onComplete(task.id); setLeaving(false) }, 300) }
  const assignedMembers = (task.assignees || [task.assignee]).map((id) => members.find((member) => member.id === id)).filter(Boolean)
  const hasFormerAssignee = assignedMembers.some((member) => member.leftAt)
  const assignableMembers = members.filter((member) => !member.leftAt)
  const [line1, line2] = splitAtWidth(task.title, titleWidth)
  const swipeWidth = cardRef.current?.offsetWidth || 320
  const swipeMaxDistance = Math.max(112, swipeWidth * .55)
  const swipeProgress = Math.min(1, Math.abs(swipeX) / swipeMaxDistance)
  const swipeOpacity = swipeLeaving ? 0 : Math.max(.18, 1 - swipeProgress * .82)
  const swipeStyle = swipeX || swipeLeaving ? { transform: `translate3d(${swipeX}px,0,0)`, opacity: swipeOpacity } : undefined
  return <div className={`swipe-delete-shell${swiping ? ' swiping' : ''}${swipeReady ? ' armed' : ''}${swipeLeaving ? ' dismissing' : ''}`}>
    <article ref={cardRef} data-task-id={task.id} className={`card swipe-delete-card${showRank ? ' hasrank' : ''}${index < 3 && !task.done ? ` t${index + 1}` : ''}${editing ? ' editing' : ''}${dragging ? ' lift' : ''}${leaving ? ' leaving' : ''}${searchHit ? ' search-hit' : ''}${newHit ? ' new-hit' : ''}${hasFormerAssignee ? ' former-assignee' : ''}`} style={swipeStyle} onPointerDown={startSwipeDelete} onPointerMove={moveSwipeDelete} onPointerUp={(event) => finishSwipeDelete(event)} onPointerCancel={(event) => finishSwipeDelete(event, true)} onClickCapture={(event) => { if (suppressSwipeClick.current) { event.preventDefault(); event.stopPropagation() } }}>
      <button className={`ck${task.done || leaving ? ' on' : ''}${leaving ? ' pop' : ''}`} aria-label={`${language==='en'?'Complete to-do':'할 일 완료'}: ${task.title}`} data-act="complete" data-id={task.id} onClick={finish}>{(task.done || leaving) && <CheckIcon />}</button>
      {showRank && <div className={`rank${index < 3 ? ' top' : ''}`}>#{index + 1}</div>}
      <div className="mid" ref={titleRef}>{editing ? <textarea ref={input} className="edit-text" aria-label={`${language === 'en' ? 'Edit to-do' : '할 일 수정'}: ${task.title}`} value={value} onChange={(event) => setValue(limitGraphemes(event.target.value, TASK_TITLE_LIMIT))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save() } if (event.key === 'Escape') { setValue(task.title); setEditingState(false) } }} /> : <button className="t-title" aria-label={task.title} data-act="title" data-id={task.id} onClick={() => { if (!task.done) setEditingState(true) }}><span aria-hidden="true" className="t-main">{line1}</span>{line2 && <span aria-hidden="true" className="t-rest">{line2}</span>}</button>}</div>
      <div className="acts">{!editing && circle && task.sourceUnread && <i className="source-unread-dot" aria-label={language==='en'?'Unseen update':'처음 확인하는 업데이트'} />}{!editing && circle && assignedMembers.length === 1 && <span className={`who${assignedMembers[0].leftAt ? ' former' : ''}`}>{assignedMembers[0].emoji}</span>}{!editing && circle && assignedMembers.length > 1 && <span className="whos">{assignedMembers.slice(0,3).map((member) => <span className={`who${member.leftAt ? ' former' : ''}`} key={member.id}>{member.emoji}</span>)}{assignedMembers.length > 3 && <span className="who more">+{assignedMembers.length-3}</span>}</span>}{editing ? <button className="save edit-save" aria-label={language==='en'?'Save edit':'수정 저장'} data-act="edit-save" data-id={task.id} onClick={save}><ArrowIcon /></button> : !task.done && showRank && reorderable ? <button className="ico grip" style={{ touchAction: 'pan-y' }} data-act="grip" data-id={task.id} aria-label={`${language==='en'?'Reorder':'순서 변경'}: ${task.title}`} onPointerDown={startGrip} onPointerMove={moveGrip} onPointerUp={(event) => finishGrip(event)} onPointerCancel={(event) => finishGrip(event, true)} onKeyDown={(event) => { if (event.key === 'ArrowUp') onMove(task.id, -1); if (event.key === 'ArrowDown') onMove(task.id, 1) }}><GripIcon /></button> : null}</div>
      {editing && circle && <div className="asgrow edit-assignee-picker" aria-label={language==='en'?'Choose assignee':'담당자 선택'}>{assignableMembers.map((member) => <button key={member.id} className={`asgc${(task.assignee || task.assignees?.[0]) === member.id ? ' on' : ''}`} data-act="edit-asg-pick" data-m={member.id} data-id={task.id} onClick={() => onAssignee(task.id, member.id)}><span className="av">{member.emoji}</span><OverflowText className="assignee-name" title={member.name}>{member.name}</OverflowText></button>)}</div>}
    </article>
  </div>
}