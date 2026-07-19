import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'

export default function Composer({ count, circle, members, onAdd }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [assignee, setAssignee] = useState(members[0]?.id || null)
  const [position, setPosition] = useState(count)
  const ref = useRef(null)

  useEffect(() => { if (open) ref.current?.focus() }, [open])
  useEffect(() => {
    if (circle && !members.some((member) => member.id === assignee)) setAssignee(members[0]?.id || null)
  }, [circle, members, assignee])
  const submit = () => {
    if (!value.trim()) return
    onAdd(value.trim(), assignee, position)
    setValue('')
    setOpen(false)
  }

  if (!open) return <button className="insert-button" onClick={() => { setPosition(count); setOpen(true) }}><b>＋</b> #{count + 1}에 끼우기</button>
  return (
    <section className="composer">
      {circle && <div className="assignee-row composer-assignees">{members.map((member) => <button key={member.id} className={assignee === member.id ? 'assignee-chip selected' : 'assignee-chip'} onClick={() => setAssignee(member.id)}><span>{member.emoji}</span>{member.name}</button>)}</div>}
      <div className="position-control"><button onClick={() => setPosition((value) => Math.max(0, value - 1))} aria-label="위 순위">−</button><span>#{position + 1}</span><button onClick={() => setPosition((value) => Math.min(count, value + 1))} aria-label="아래 순위">＋</button></div>
      <textarea ref={ref} value={value} placeholder="할 일을 입력하세요" onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} />
      <button className="save-button" onClick={submit} aria-label="할 일 추가"><ArrowIcon /></button>
    </section>
  )
}
