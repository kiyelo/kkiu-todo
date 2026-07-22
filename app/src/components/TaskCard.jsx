import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowIcon, CheckIcon, GripIcon } from './Icons.jsx'
import OverflowText from './OverflowText.jsx'

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

export default function TaskCard({ task, index, members, circle, onComplete, onEdit, onAssignee, onMove, onDragStart, onDragMove, onDragEnd, dragging, reorderable = true, selecting, selected, onSelect, onLongPress, showRank = true, searchHit = false, newHit = false, language = 'ko' }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.title)
  const [leaving, setLeaving] = useState(false)
  const [titleWidth, setTitleWidth] = useState(0)
  const input = useRef(null); const cardRef = useRef(null); const titleRef = useRef(null)
  const hold = useRef(null); const point = useRef(null); const grip = useRef(null); const suppressHoldClick = useRef(false)

  useEffect(() => { if (editing) { input.current?.focus(); input.current?.setSelectionRange(value.length, value.length) } }, [editing])
  useLayoutEffect(() => {
    const element = titleRef.current
    if (!element) return undefined
    const measure = () => setTitleWidth(element.clientWidth)
    measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect()
  }, [editing])
  useEffect(() => { if (!editing) return undefined; const outside = (event) => { if (!cardRef.current?.contains(event.target)) { setValue(task.title); setEditing(false) } }; document.addEventListener('pointerdown', outside, true); return () => document.removeEventListener('pointerdown', outside, true) }, [editing, task.title])
  const save = () => { const next = value.trim(); if (next) onEdit(task.id, next); setEditing(false) }
  const clearHold = (event) => {
    const current = point.current
    if (event && current?.pointerId !== event.pointerId) return
    window.clearTimeout(hold.current)
    hold.current = null
    point.current = null
    current?.cleanup?.()
    if (current?.triggered) window.setTimeout(() => { suppressHoldClick.current = false }, 0)
  }
  const startHold = (event) => {
    if (editing || task.done || selecting || event.target.closest('.grip,input,textarea')) return
    clearHold()
    const state = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, triggered: false, cleanup: null }
    const move = (nextEvent) => {
      if (point.current !== state || state.pointerId !== nextEvent.pointerId || state.triggered) return
      if (Math.abs(nextEvent.clientX - state.x) >= 8 || Math.abs(nextEvent.clientY - state.y) >= 8) clearHold(nextEvent)
    }
    const end = (nextEvent) => { if (point.current === state) clearHold(nextEvent) }
    state.cleanup = () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', end, true)
      window.removeEventListener('pointercancel', end, true)
    }
    point.current = state
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', end, true)
    window.addEventListener('pointercancel', end, true)
    hold.current = window.setTimeout(() => {
      const current = point.current
      if (!current) return
      hold.current = null
      current.triggered = true
      suppressHoldClick.current = true
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
      onLongPress?.(task.id)
    }, 460)
  }

  useEffect(() => () => {
    window.clearTimeout(hold.current)
    window.clearTimeout(grip.current?.timer)
    point.current?.cleanup?.()
    const current = grip.current
    if (current?.element) { current.element.dataset.reorderArmed = 'false'; current.element.dataset.queueMoved = 'false' }
    hold.current = null; point.current = null; grip.current = null; suppressHoldClick.current = false
  }, [])

  const startGrip = (event) => {
    if (!reorderable || selecting) return
    const element = event.currentTarget
    const state = { element, pointerId: event.pointerId, x: event.clientX, y: event.clientY, armed: false, timer: null }
    element.dataset.reorderArmed = 'false'; element.dataset.queueMoved = 'false'
    state.timer = window.setTimeout(() => {
      if (element.dataset.queueMoved === 'true' || grip.current !== state) return
      state.armed = true; element.dataset.reorderArmed = 'true'
      try { element.setPointerCapture(event.pointerId) } catch {}
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(14)
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
    if (state.armed) {
      event.preventDefault(); event.stopPropagation()
      try { state.element.releasePointerCapture(event.pointerId) } catch {}
      onDragEnd?.(event, cancelled)
    }
    state.element.dataset.reorderArmed = 'false'; state.element.dataset.queueMoved = 'false'; grip.current = null
  }

  const finish = () => { if (task.done || selecting) return; setLeaving(true); window.setTimeout(() => { onComplete(task.id); setLeaving(false) }, 300) }
  const assignedMembers = (task.assignees || [task.assignee]).map((id) => members.find((member) => member.id === id)).filter(Boolean)
  const [line1, line2] = splitAtWidth(task.title, titleWidth)
  return <article ref={cardRef} data-task-id={task.id} className={`card${showRank ? ' hasrank' : ''}${index < 3 && !task.done ? ` t${index + 1}` : ''}${editing ? ' editing' : ''}${selected ? ' sel-on' : ''}${dragging ? ' lift' : ''}${leaving ? ' leaving' : ''}${searchHit ? ' search-hit' : ''}${newHit ? ' new-hit' : ''}`} onPointerDown={startHold} onClickCapture={(event) => { if (suppressHoldClick.current) { event.preventDefault(); event.stopPropagation() } }}>
    <button className={`ck${task.done || selected || leaving ? ' on' : ''}${leaving ? ' pop' : ''}`} aria-label={selecting ? `${selected ? (language==='en'?'Deselect':'선택 해제') : (language==='en'?'Select':'선택')}: ${task.title}` : `${language==='en'?'Complete to-do':'할 일 완료'}: ${task.title}`} data-act={selecting ? 'sel' : 'complete'} data-id={task.id} onClick={() => selecting ? onSelect(task.id) : finish()}>{(task.done || selected || leaving) && <CheckIcon />}</button>
    {showRank && <div className={`rank${index < 3 ? ' top' : ''}`}>#{index + 1}</div>}
    <div className="mid" ref={titleRef}>{editing ? <textarea ref={input} className="edit-text" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save() } if (event.key === 'Escape') { setValue(task.title); setEditing(false) } }} /> : <button className="t-title" data-act="title" data-id={task.id} onClick={() => selecting ? onSelect(task.id) : !task.done && setEditing(true)}><span className="t-main">{line1}</span>{line2 && <span className="t-rest">{line2}</span>}</button>}</div>
    <div className="acts">{!editing && circle && task.sourceUnread && <i className="source-unread-dot" aria-label={language==='en'?'Unseen update':'처음 확인하는 업데이트'} />}{!editing && circle && assignedMembers.length === 1 && <span className="who">{assignedMembers[0].emoji}</span>}{!editing && circle && assignedMembers.length > 1 && <span className="whos">{assignedMembers.slice(0,3).map((member) => <span className="who" key={member.id}>{member.emoji}</span>)}{assignedMembers.length > 3 && <span className="who more">+{assignedMembers.length-3}</span>}</span>}{editing ? <button className="save edit-save" aria-label={language==='en'?'Save edit':'수정 저장'} data-act="edit-save" data-id={task.id} onClick={save}><ArrowIcon /></button> : !task.done && showRank && reorderable ? <button className="ico grip" data-act="grip" data-id={task.id} aria-label={`${language==='en'?'Reorder':'순서 변경'}: ${task.title}`} onPointerDown={startGrip} onPointerMove={moveGrip} onPointerUp={(event) => finishGrip(event)} onPointerCancel={(event) => finishGrip(event, true)} onKeyDown={(event) => { if (event.key === 'ArrowUp') onMove(task.id, -1); if (event.key === 'ArrowDown') onMove(task.id, 1) }}><GripIcon /></button> : null}</div>
    {editing && circle && <div className="asgrow edit-assignee-picker" aria-label={language==='en'?'Choose assignee':'담당자 선택'}>{members.map((member) => <button key={member.id} className={`asgc${(task.assignee || task.assignees?.[0]) === member.id ? ' on' : ''}`} data-act="edit-asg-pick" data-m={member.id} data-id={task.id} onClick={() => onAssignee(task.id, member.id)}><span className="av">{member.emoji}</span><OverflowText className="assignee-name" title={member.name}>{member.name}</OverflowText></button>)}</div>}
  </article>
}
