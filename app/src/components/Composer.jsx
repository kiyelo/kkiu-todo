import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from './Icons.jsx'
import { t } from '../i18n.js'
import OverflowText from './OverflowText.jsx'
import { TASK_TITLE_LIMIT, limitGraphemes, normalizeTaskTitle } from '../utils/text.js'

const composerDrafts = new Map()
const draftKeyFor = (circle) => circle?.id ? `circle:${circle.id}` : 'personal'

export default function Composer({ count, circle, members, onAdd, position = count, onOpenChange, language = 'ko' }) {
  const assignableMembers = members.filter((member) => !member.leftAt)
  const draftKey = draftKeyFor(circle)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(() => composerDrafts.get(draftKey) || '')
  const [assignees, setAssignees] = useState(() => (assignableMembers[0]?.id ? [assignableMembers[0].id] : ['me']))
  const ref = useRef(null)
  const rootRef = useRef(null)
  const outsideGestureRef = useRef(null)
  const reopenBlockedUntil = useRef(0)

  useEffect(() => { if (open) ref.current?.focus(); onOpenChange?.(open) }, [open, onOpenChange])
  useEffect(() => { setValue(composerDrafts.get(draftKey) || '') }, [draftKey])
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) { outsideGestureRef.current = null; return }
      outsideGestureRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    }
    const onPointerMove = (event) => {
      const gesture = outsideGestureRef.current
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.moved) return
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) gesture.moved = true
    }
    const onPointerUp = (event) => {
      const gesture = outsideGestureRef.current
      if (!gesture || gesture.pointerId !== event.pointerId) return
      outsideGestureRef.current = null
      if (!gesture.moved) setOpen(false)
    }
    const onPointerCancel = (event) => {
      if (outsideGestureRef.current?.pointerId === event.pointerId) outsideGestureRef.current = null
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    return () => {
      outsideGestureRef.current = null
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
    }
  }, [open])
  useEffect(() => {
    setAssignees((current) => {
      const valid = current.filter((id) => assignableMembers.some((member) => member.id === id))
      if (valid.length) return valid.length === current.length ? current : valid
      return assignableMembers[0]?.id ? [assignableMembers[0].id] : ['me']
    })
  }, [members])

  const setDraftValue = (next) => {
    setValue(next)
    if (next) composerDrafts.set(draftKey, next)
    else composerDrafts.delete(draftKey)
  }
  const toggleAssignee = (id) => setAssignees((current) => {
    if (current.includes(id)) {
      const next = current.filter((item) => item !== id)
      return next.length ? next : current
    }
    return [...current, id]
  })
  const dismiss = () => setOpen(false)
  const clearAndClose = () => { setDraftValue(''); setOpen(false) }
  const multi = Boolean(circle) && assignees.length > 1
  const submit = () => {
    const next = normalizeTaskTitle(value)
    if (!next) return
    reopenBlockedUntil.current = performance.now() + 450
    onAdd(next, circle ? assignees : 'me', position)
    clearAndClose()
  }

  return <div ref={rootRef} className={`slotwrap${open ? ' open' : ''}`}>
    <button className="ins" data-act="slot-open" onClick={() => { if (performance.now() >= reopenBlockedUntil.current) setOpen(true) }}><span className="p">+</span><span>{t(language, 'insert', position + 1)}</span></button>
    <div className="ibar">
      {circle && <div className="asgrow" aria-label={language === 'en' ? 'Choose assignees' : '담당자 선택'}>{assignableMembers.map((member) => {
        const order = assignees.indexOf(member.id)
        return <button key={member.id} className={`asgc${order >= 0 ? ' on' : ''}`} data-act="asg-pick" data-m={member.id} aria-pressed={order >= 0} onClick={() => toggleAssignee(member.id)}>
          <span className="av">{member.emoji}</span><OverflowText className="assignee-name" title={member.name}>{member.name}</OverflowText>
          {multi && order >= 0 && <i className="asg-order">{order + 1}</i>}
        </button>
      })}</div>}
      <span className="ipos">{position + 1}</span>
      <textarea ref={ref} className="si" rows="1" value={value} onChange={(event) => setDraftValue(limitGraphemes(event.target.value, TASK_TITLE_LIMIT))} placeholder={t(language, 'placeholder')} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } if (event.key === 'Escape') dismiss() }} />
      <button className="save" aria-label={language === 'en' ? 'Add task' : '할 일 추가'} data-act="add-submit" onClick={submit}><ArrowIcon /></button>
    </div>
  </div>
}
