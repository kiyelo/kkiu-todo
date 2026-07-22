import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'
import { t } from '../i18n.js'
import OverflowText from './OverflowText.jsx'

export default function Composer({ count, circle, members, onAdd, position = count, onOpenChange, language = 'ko' }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [assignees, setAssignees] = useState(() => (members[0]?.id ? [members[0].id] : ['me']))
  const ref = useRef(null)
  useEffect(() => { if (open) ref.current?.focus(); onOpenChange?.(open) }, [open, onOpenChange])
  useEffect(() => {
    setAssignees((current) => {
      const valid = current.filter((id) => members.some((member) => member.id === id))
      if (valid.length) return valid.length === current.length ? current : valid
      return members[0]?.id ? [members[0].id] : ['me']
    })
  }, [members])
  const toggleAssignee = (id) => setAssignees((current) => {
    if (current.includes(id)) {
      const next = current.filter((item) => item !== id)
      return next.length ? next : current
    }
    return [...current, id]
  })
  const close = () => { setValue(''); setOpen(false) }
  const multi = Boolean(circle) && assignees.length > 1
  const submit = () => {
    const next = value.trim()
    if (!next) return
    onAdd(next, circle ? assignees : 'me', position)
    close()
  }
  return <div className={`slotwrap${open ? ' open' : ''}`}>
    <button className="ins" data-act="slot-open" onClick={() => setOpen(true)}><span className="p">+</span><span>{t(language, 'insert', position + 1)}</span></button>
    <div className="ibar">
      {circle && <div className="asgrow" aria-label={language === 'en' ? 'Choose assignees' : '담당자 선택'}>{members.map((member) => {
        const order = assignees.indexOf(member.id)
        return <button key={member.id} className={`asgc${order >= 0 ? ' on' : ''}`} data-act="asg-pick" data-m={member.id} aria-pressed={order >= 0} onClick={() => toggleAssignee(member.id)}>
          <span className="av">{member.emoji}</span><OverflowText className="assignee-name" title={member.name}>{member.name}</OverflowText>
          {multi && order >= 0 && <i className="asg-order">{order + 1}</i>}
        </button>
      })}</div>}
      <span className="ipos">{position + 1}</span>
      <textarea ref={ref} className="si" rows="1" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t(language, 'placeholder')} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } if (event.key === 'Escape') close() }} />
      <button className="save" aria-label={language === 'en' ? 'Add task' : '할 일 추가'} data-act="add-submit" onClick={submit}><ArrowIcon /></button>
    </div>
  </div>
}
