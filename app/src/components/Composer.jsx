import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'

export default function Composer({ count, circle, members, onAdd, position = count }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [assignee, setAssignee] = useState(members[0]?.id || null)
  const ref = useRef(null)

  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])

  useEffect(() => {
    if (circle && !members.some((member) => member.id === assignee)) {
      setAssignee(members[0]?.id || null)
    }
  }, [circle, members, assignee])

  const close = () => {
    setValue('')
    setOpen(false)
  }

  const submit = () => {
    const title = value.trim()
    if (!title) return
    onAdd(title, assignee, position)
    close()
  }

  return (
    <div className={open ? 'floating-composer open' : 'floating-composer'}>
      {!open ? (
        <button
          className="floating-insert"
          onClick={() => setOpen(true)}
          aria-label={`${position + 1}번 위치에 할 일 추가`}
        >
          <span className="floating-plus">＋</span>
          <b>#{position + 1}</b>에 끼우기
        </button>
      ) : (
        <section className="floating-input-card">
          {circle && (
            <div className="assignee-row floating-assignees">
              {members.map((member) => (
                <button
                  key={member.id}
                  className={assignee === member.id ? 'assignee-chip selected' : 'assignee-chip'}
                  onClick={() => setAssignee(member.id)}
                >
                  <span>{member.emoji}</span>{member.name}
                </button>
              ))}
            </div>
          )}

          <span className="floating-position">#{position + 1}</span>
          <textarea
            ref={ref}
            value={value}
            placeholder="할 일을 입력하세요"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
              if (event.key === 'Escape') close()
            }}
          />
          <button className="floating-close" onClick={close} aria-label="입력 취소">×</button>
          <button className="save-button floating-save" onClick={submit} aria-label="할 일 추가">
            <ArrowIcon />
          </button>
        </section>
      )}
    </div>
  )
}
