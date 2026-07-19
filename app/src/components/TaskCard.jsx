import { useEffect, useRef, useState } from 'react'
import { ArrowIcon, CheckIcon } from './Icons.jsx'

export default function TaskCard({ task, index, members, circle, onComplete, onEdit, onAssignee, onMove, selecting, selected, onSelect, onLongPress, showRank = true }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.title)
  const inputRef = useRef(null)
  const holdRef = useRef(null)
  const pointRef = useRef(null)
  const longPressedRef = useRef(false)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const save = () => {
    const next = value.trim()
    if (next) onEdit(task.id, next)
    setEditing(false)
  }

  const clearHold = () => { if (holdRef.current) window.clearTimeout(holdRef.current); holdRef.current = null }
  const startHold = (event) => {
    if (editing || task.done || event.pointerType === 'mouse' && event.button !== 0) return
    pointRef.current = { x: event.clientX, y: event.clientY }
    holdRef.current = window.setTimeout(() => { holdRef.current = null; longPressedRef.current = true; onLongPress?.(task.id) }, 520)
  }
  const moveHold = (event) => {
    const point = pointRef.current
    if (point && (Math.abs(event.clientX - point.x) > 8 || Math.abs(event.clientY - point.y) > 8)) clearHold()
  }

  return (
    <article className={`${editing ? 'task-card editing' : 'task-card'}${task.done ? ' task-done' : ''}${showRank ? '' : ' no-rank'}${selected ? ' selected-card' : ''}`} onPointerDown={startHold} onPointerMove={moveHold} onPointerUp={clearHold} onPointerCancel={clearHold} onClickCapture={(event) => { if (longPressedRef.current) { longPressedRef.current = false; event.preventDefault(); event.stopPropagation() } }}>
      <button className={selected ? 'check selected-check' : task.done ? 'check checked' : 'check'} onClick={() => selecting ? onSelect(task.id) : onComplete(task.id)} aria-label={selecting ? `${task.title} 선택` : `${task.title} ${task.done ? '복원' : '완료'}`}><CheckIcon /></button>
      {showRank && <span className={index < 3 ? `rank top rank-${index + 1}` : 'rank'}>#{index + 1}</span>}
      <div className="task-main">
        {editing ? (
          <textarea ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save() }
            if (event.key === 'Escape') { setValue(task.title); setEditing(false) }
          }} />
        ) : <button className="task-title" onClick={() => selecting ? onSelect(task.id) : !task.done && setEditing(true)}>{task.title}</button>}
      </div>
      {editing ? <button className="save-button" onClick={save} aria-label="수정 저장"><ArrowIcon /></button> : selecting ? null : <div className="card-actions">{circle && <span className="assignee-emoji">{members.find((member) => member.id === task.assignee)?.emoji}</span>}{!task.done && showRank && <div className="reorder-actions"><button disabled={index === 0} onClick={() => onMove(task.id, -1)} aria-label="한 칸 위로">↑</button><button onClick={() => onMove(task.id, 1)} aria-label="한 칸 아래로">↓</button></div>}</div>}
      {editing && circle && (
        <div className="assignee-row">
          {members.map((member) => <button key={member.id} className={task.assignee === member.id ? 'assignee-chip selected' : 'assignee-chip'} onClick={() => onAssignee(task.id, member.id)}><span>{member.emoji}</span>{member.name}</button>)}
        </div>
      )}
    </article>
  )
}
