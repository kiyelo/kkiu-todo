import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'
import { t } from '../i18n.js'

export default function Composer({ count, circle, members, onAdd, position = count, onOpenChange, language = 'ko' }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [assignees, setAssignees] = useState(() => (members[0]?.id ? [members[0].id] : ['me']))
  const [mode, setMode] = useState('together')
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
    onAdd(next, circle ? assignees : 'me', position, multi ? mode : 'together')
    close()
  }
  return <div className={`slotwrap${open ? ' open' : ''}`}>
    <button className="ins" data-act="slot-open" onClick={() => setOpen(true)}><span className="p">+</span><span>{t(language, 'insert', position + 1)}</span></button>
    <div className="ibar">
      {circle && <div className="asgrow" aria-label={language === 'en' ? 'Choose assignees' : '담당자 선택'}>{members.map((member) => {
        const order = assignees.indexOf(member.id)
        return <button key={member.id} className={`asgc${order >= 0 ? ' on' : ''}`} data-act="asg-pick" data-m={member.id} aria-pressed={order >= 0} onClick={() => toggleAssignee(member.id)}>
          <span className="av">{member.emoji}</span>{member.name}
          {multi && order >= 0 && <i className="asg-order">{order + 1}</i>}
        </button>
      })}</div>}
      {multi && <div className="assign-mode" role="radiogroup" aria-label={language === 'en' ? 'Assignment mode' : '배정 방식'}>
        <button type="button" role="radio" aria-checked={mode === 'together'} className={`assign-mode-opt${mode === 'together' ? ' on' : ''}`} data-act="asg-mode" data-mode="together" onClick={() => setMode('together')}>
          <i className="asg-radio" aria-hidden="true" /><span>{language === 'en' ? 'One task done together' : '함께 완료하는 하나의 할 일'}</span>
        </button>
        <button type="button" role="radio" aria-checked={mode === 'each'} className={`assign-mode-opt${mode === 'each' ? ' on' : ''}`} data-act="asg-mode" data-mode="each" onClick={() => setMode('each')}>
          <i className="asg-radio" aria-hidden="true" /><span>{language === 'en' ? `${assignees.length} tasks done individually` : `각자 완료하는 할 일 ${assignees.length}개`}</span>
        </button>
      </div>}
      <span className="ipos">{position + 1}</span>
      <textarea ref={ref} className="si" rows="1" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t(language, 'placeholder')} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } if (event.key === 'Escape') close() }} />
      <button className="save" aria-label={language === 'en' ? 'Add task' : '할 일 추가'} data-act="add-submit" onClick={submit}><ArrowIcon /></button>
    </div>
  </div>
}
