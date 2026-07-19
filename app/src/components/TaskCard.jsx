import { useEffect, useRef, useState } from 'react'
import { ArrowIcon, CheckIcon } from './Icons.jsx'

export default function TaskCard({ task, index, members, circle, onComplete, onEdit, onAssignee, showRank = true }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const save = () => {
    const next = value.trim()
    if (next) onEdit(task.id, next)
    setEditing(false)
  }

  return (
    <article className={`${editing ? 'task-card editing' : 'task-card'}${task.done ? ' task-done' : ''}${showRank ? '' : ' no-rank'}`}>
      <button className={task.done ? 'check checked' : 'check'} onClick={() => onComplete(task.id)} aria-label={`${task.title} ${task.done ? '복원' : '완료'}`}><CheckIcon /></button>
      {showRank && <span className={index < 3 ? `rank top rank-${index + 1}` : 'rank'}>#{index + 1}</span>}
      <div className="task-main">
        {editing ? (
          <textarea ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save() }
            if (event.key === 'Escape') { setValue(task.title); setEditing(false) }
          }} />
        ) : <button className="task-title" onClick={() => !task.done && setEditing(true)}>{task.title}</button>}
      </div>
      {editing ? <button className="save-button" onClick={save} aria-label="수정 저장"><ArrowIcon /></button> : circle && <span className="assignee-emoji">{members.find((member) => member.id === task.assignee)?.emoji}</span>}
      {editing && circle && (
        <div className="assignee-row">
          {members.map((member) => <button key={member.id} className={task.assignee === member.id ? 'assignee-chip selected' : 'assignee-chip'} onClick={() => onAssignee(task.id, member.id)}><span>{member.emoji}</span>{member.name}</button>)}
        </div>
      )}
    </article>
  )
}
