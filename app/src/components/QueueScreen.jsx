import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CircleFilters from './CircleFilters.jsx'
import Composer from './Composer.jsx'
import TaskCard from './TaskCard.jsx'
import useFloatingQueue from '../hooks/useFloatingQueue.js'
import { t } from '../i18n.js'
import { interactionFeedback } from '../services/interactionFeedback.js'

const H = { task: 72, ghost: 52, bundle: 56, collapse: 42, ad: 100, done: 56 }
const VIRTUAL_WINDOW_PX = 1200
const SEARCH_RESULT_LIMIT = 200
const REORDER_EDGE_PX = 76
const REORDER_MAX_SCROLL_PX = 15
const assignees = (task) => task.assignees || (task.assignee ? [task.assignee] : [])
const adBefore = (index) => index === 10 || (index > 10 && (index - 10) % 20 === 0)

function buildModel(active, filter, showContext, expanded, doneCount, suppressAds = false) {
  const rows = []; const slots = []; let y = 0
  const slot = (globalIndex) => { const last = slots[slots.length - 1]; if (!last || last.globalIndex !== globalIndex || last.y !== y) slots.push({ y, globalIndex }) }
  if (!filter) {
    active.forEach((task, globalIndex) => { slot(globalIndex); if (!suppressAds && adBefore(globalIndex)) { rows.push({ kind: 'ad', globalIndex, y, key: `ad-${globalIndex}` }); y += H.ad; slot(globalIndex) } rows.push({ kind: 'task', task, globalIndex, y, key: task.id }); y += H.task })
    slots.push({ y, globalIndex: active.length })
  } else if (!showContext) {
    active.forEach((task, globalIndex) => { if (assignees(task).includes(filter)) { slot(globalIndex); rows.push({ kind: 'task', task, globalIndex, y, key: task.id }); y += H.task } })
    slots.push({ y, globalIndex: active.length })
  } else {
    let i = 0
    while (i < active.length) {
      if (assignees(active[i]).includes(filter)) { slot(i); rows.push({ kind: 'task', task: active[i], globalIndex: i, y, key: active[i].id }); y += H.task; i += 1; continue }
      let end = i
      while (end < active.length && !assignees(active[end]).includes(filter)) end += 1
      const key = `${i}-${end}`; const count = end - i
      if (count < 3 || expanded === key) {
        if (count >= 3) { rows.push({ kind: 'collapse', from: i, to: end, y, key }); y += H.collapse }
        for (let cursor = i; cursor < end; cursor += 1) { slot(cursor); rows.push({ kind: 'ghost', task: active[cursor], globalIndex: cursor, y, key: `ghost-${active[cursor].id}` }); y += H.ghost }
      } else { slot(i); rows.push({ kind: 'bundle', from: i, to: end, count, y, key }); y += H.bundle }
      i = end
    }
    slots.push({ y, globalIndex: active.length })
  }
  if (doneCount) { y += 6; rows.push({ kind: 'done', count: doneCount, y, key: 'done' }); y += H.done }
  return { rows, slots, total: y }
}

function buildReorderModel(active) {
  const rows = active.map((task, globalIndex) => ({ kind: 'task', task, globalIndex, y: globalIndex * H.task, key: task.id }))
  const slots = active.map((_, globalIndex) => ({ y: globalIndex * H.task, globalIndex }))
  slots.push({ y: active.length * H.task, globalIndex: active.length })
  return { rows, slots, total: active.length * H.task }
}

const markText = (title, query) => { const normalized = query.trim(); if (!normalized) return title; const index = title.toLowerCase().indexOf(normalized.toLowerCase()); return index < 0 ? title : <>{title.slice(0, index)}<mark>{title.slice(index, index + normalized.length)}</mark>{title.slice(index + normalized.length)}</> }

export default function QueueScreen(props) {
  const { viewKey, focusVisit = 0, dataReady = true, tasks, members, circle, circleMode, onCreateCircle, onJoinCircle, query, onQuery, onSearchResult, focusTaskId, newTaskId, filter, onFilter, onAdd, onComplete, onEdit, onAssignee, onMove, onMoveTo, selecting, selected, onSelect, onLongPress, onSelectAll, onDeleteSelected, onAssignSelected, onCancelSelect, onCompleted, initialPosition = null, onPositionChange, language = 'ko' } = props
  const [reorder, setReorder] = useState(null); const reorderRef = useRef(null); const reorderFrameRef = useRef(null); const reorderPointerYRef = useRef(null); const [assignOpen, setAssignOpen] = useState(false); const [composerOpen, setComposerOpen] = useState(false); const [expanded, setExpanded] = useState(null); const [flashId, setFlashId] = useState(focusTaskId)
  useEffect(() => { if (!selecting) setAssignOpen(false) }, [selecting])
  useEffect(() => { if (!focusTaskId) return undefined; setFlashId(focusTaskId); const timer = window.setTimeout(() => setFlashId(null), 2700); return () => window.clearTimeout(timer) }, [focusTaskId])
  useEffect(() => { if (!filter) { setComposerOpen(false); setExpanded(null) } }, [filter])
  useEffect(() => () => { if (reorderFrameRef.current) cancelAnimationFrame(reorderFrameRef.current) }, [])
  const active = useMemo(() => tasks.filter((task) => !task.done), [tasks])
  const completedCount = tasks.length - active.length
  const fullModel = useMemo(() => buildModel(active, circle && filter, composerOpen, expanded, completedCount), [active, circle, filter, composerOpen, expanded, completedCount])
  const reorderModel = useMemo(() => reorder ? buildReorderModel(active) : null, [active, reorder])
  const wantedGlobal = focusTaskId ? Math.min(active.findIndex((task) => task.id === focusTaskId) + 1, active.length) : initialPosition ?? Math.min(circleMode ? 3 : 4, active.length)
  const initialSlot = Math.max(0, fullModel.slots.findIndex((item) => item.globalIndex >= wantedGlobal))
  const queue = useFloatingQueue(Math.max(0, fullModel.slots.length - 1), initialSlot < 0 ? fullModel.slots.length - 1 : initialSlot, {
    positions: fullModel.slots.map((item) => item.y),
    rowHeight: 72,
    ariaLabel: language === 'en' ? 'Insert position' : '끼워 넣을 위치',
    ariaValueText: (current, total) => language === 'en' ? `Position ${current} of ${total}` : `전체 ${total}곳 중 ${current}번째`,
  })
  const currentSlot = fullModel.slots[queue.index] || fullModel.slots[0] || { y: 0, globalIndex: 0 }
  const renderModel = reorderModel || fullModel
  const renderCurrentSlot = reorder ? (renderModel.slots.find((item) => item.globalIndex >= currentSlot.globalIndex) || renderModel.slots[renderModel.slots.length - 1] || { y: 0, globalIndex: 0 }) : currentSlot
  const visibleRows = useMemo(() => renderModel.rows.filter((row) => Math.abs(row.y - renderCurrentSlot.y) <= VIRTUAL_WINDOW_PX), [renderModel.rows, renderCurrentSlot.y])
  const model = { ...renderModel, rows: visibleRows }
  const trackAnchorOffset = reorder?.trackAnchorOffset || 0
  useEffect(() => { onPositionChange?.(currentSlot.globalIndex) }, [currentSlot.globalIndex, onPositionChange])
  useEffect(() => { const next = fullModel.slots.findIndex((item) => item.globalIndex >= wantedGlobal); if (next >= 0) queue.setIndex(next) }, [viewKey, dataReady, filter, expanded, focusTaskId, focusVisit])
  const draggingId = reorder?.id || null
  const readReorderRows = () => [...document.querySelectorAll('.queue-task-row[data-task-index]')].map((row) => { const rect = row.getBoundingClientRect(); return { id: row.dataset.taskId, index: Number(row.dataset.taskIndex), top: rect.top, bottom: rect.bottom, center: rect.top + rect.height / 2, height: rect.height } }).sort((a, b) => a.index - b.index)
  const updateReorderAt = (pointerY) => {
    const current = reorderRef.current
    if (!current) return
    const rows = readReorderRows()
    const dragged = rows.find((item) => item.id === current.id)
    if (!dragged) return

    const baseTop = dragged.top - current.offset
    const desiredTop = pointerY - current.grabOffsetY
    const offset = desiredTop - baseTop
    const draggedCenter = desiredTop + current.height / 2
    const remaining = rows.filter((item) => item.id !== current.id)
    const slots = []

    remaining.forEach((item) => {
      const to = item.index > current.from ? item.index - 1 : item.index
      slots.push({ to, y: item.top })
    })
    if (remaining.length) {
      const last = remaining[remaining.length - 1]
      const lastTo = last.index > current.from ? last.index - 1 : last.index
      slots.push({ to: Math.min(active.length - 1, lastTo + 1), y: last.bottom })
    } else {
      slots.push({ to: current.from, y: draggedCenter })
    }

    let to = current.to; let bestDistance = Infinity
    slots.forEach((slot) => {
      const distance = Math.abs(draggedCenter - slot.y)
      if (distance < bestDistance) { bestDistance = distance; to = slot.to }
    })
    to = Math.max(0, Math.min(active.length - 1, to))

    const next = { ...current, to, pointerY, offset }
    if (to !== current.to) interactionFeedback(6)
    reorderRef.current = next
    setReorder(next)
  }
  const runReorderAutoScroll = () => {
    reorderFrameRef.current = null
    const current = reorderRef.current
    const scroller = queue.scrollerRef.current
    const pointerY = reorderPointerYRef.current
    if (!current || !scroller || pointerY == null) return
    const rect = scroller.getBoundingClientRect()
    let speed = 0
    if (pointerY < rect.top + REORDER_EDGE_PX) speed = -REORDER_MAX_SCROLL_PX * Math.min(1, (rect.top + REORDER_EDGE_PX - pointerY) / REORDER_EDGE_PX)
    else if (pointerY > rect.bottom - REORDER_EDGE_PX) speed = REORDER_MAX_SCROLL_PX * Math.min(1, (pointerY - (rect.bottom - REORDER_EDGE_PX)) / REORDER_EDGE_PX)
    if (speed) {
      const before = scroller.scrollTop
      scroller.scrollTop += speed
      if (scroller.scrollTop !== before) updateReorderAt(pointerY)
    }
    if (reorderRef.current) reorderFrameRef.current = requestAnimationFrame(runReorderAutoScroll)
  }
  const startReorder = (id, event) => {
    const from = active.findIndex((task) => task.id === id)
    if (from < 0) return
    const row = readReorderRows().find((item) => item.id === id)
    const top = row?.top ?? event.clientY - H.task / 2
    const height = row?.height || H.task
    const modelRow = fullModel.rows.find((item) => item.kind === 'task' && item.task.id === id)
    const compactCurrentY = Math.min(currentSlot.globalIndex, active.length) * H.task
    const compactDraggedY = from * H.task
    const fullDraggedY = modelRow?.y ?? compactDraggedY
    const fullShift = from >= currentSlot.globalIndex ? 81 : 2
    const trackAnchorOffset = compactDraggedY + 2 - compactCurrentY - (fullDraggedY + fullShift - currentSlot.y)
    const next = { id, from, to: from, startY: event.clientY, pointerY: event.clientY, grabOffsetY: event.clientY - top, height, offset: 0, trackAnchorOffset }
    reorderRef.current = next; reorderPointerYRef.current = event.clientY; setReorder(next)
    if (!reorderFrameRef.current) reorderFrameRef.current = requestAnimationFrame(runReorderAutoScroll)
  }
  const dragMove = (event) => { if (!reorderRef.current) return; reorderPointerYRef.current = event.clientY; updateReorderAt(event.clientY); if (!reorderFrameRef.current) reorderFrameRef.current = requestAnimationFrame(runReorderAutoScroll) }
  const finishReorder = (_event, cancelled) => { const current = reorderRef.current; if (reorderFrameRef.current) cancelAnimationFrame(reorderFrameRef.current); reorderFrameRef.current = null; reorderPointerYRef.current = null; if (current && !cancelled && current.to !== current.from) onMoveTo(current.id, active[current.to]?.id); reorderRef.current = null; setReorder(null) }
  const liveIndex = (index, id) => { if (!reorder) return index; if (id === reorder.id) return reorder.to; if (reorder.from < reorder.to && index > reorder.from && index <= reorder.to) return index - 1; if (reorder.from > reorder.to && index >= reorder.to && index < reorder.from) return index + 1; return index }
  const card = (task, index, extra = {}) => <TaskCard key={extra.key || task.id} task={task} index={index} members={members} circle={circle} onComplete={onComplete} onEdit={onEdit} onAssignee={onAssignee} onMove={onMove} onMoveTo={onMoveTo} onDragStart={startReorder} onDragMove={dragMove} onDragEnd={finishReorder} dragging={draggingId === task.id} selecting={selecting} selected={selected.has(task.id)} onSelect={onSelect} onLongPress={onLongPress} searchHit={flashId === task.id} newHit={newTaskId?.has?.(task.id) || false} language={language} {...extra} />

  if (circleMode && !circle) return <div className="stage"><div className="scroller"><div className="list"><div className="empty"><div className="empty-c"><h3>{language === 'en' ? 'Start a shared to-do list' : '함께할 끼리를 시작해보세요'}</h3><p>{language === 'en' ? 'Join an invitation or create a new Circle.' : '초대받은 끼리에 참여하거나 새로 만들 수 있어요.'}</p></div><div className="empty-circle-actions"><button className="featins" data-act="circle-join" onClick={onJoinCircle}><span className="p">→</span>{language === 'en' ? 'Join with invite code' : '초대 코드로 참여'}</button><button className="featins" data-act="circle-new" onClick={onCreateCircle}><span className="p">+</span>{language === 'en' ? 'New circle' : '새 끼리 만들기'}</button></div></div></div></div></div>
  if (query !== null) { const normalized = query.trim().toLowerCase(); const results = tasks.filter((task) => task.title.toLowerCase().includes(normalized)); const shown = results.slice(0, SEARCH_RESULT_LIMIT); const activeResults = shown.filter((task) => !task.done); const doneResults = shown.filter((task) => task.done); return <div className="stage search-stage"><div className="scroller"><div className="list search-list"><input autoFocus className="field search-field" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t(language, 'searchPlaceholder')} />{normalized ? results.length ? <>{results.length > SEARCH_RESULT_LIMIT && <div className="ghead" role="status"><span>{language === 'en' ? `Showing the first ${SEARCH_RESULT_LIMIT} of ${results.length} results. Refine your search to see others.` : `${results.length}개 중 앞의 ${SEARCH_RESULT_LIMIT}개를 표시해요. 검색어를 더 구체적으로 입력해 주세요.`}</span></div>}{activeResults.map((task) => <button className="srow" data-act="search-go" key={task.id} onClick={() => onSearchResult?.(task)}><span className="rankc">#{active.findIndex((item) => item.id === task.id) + 1}</span><span className="stt">{markText(task.title, query)}</span></button>)}{doneResults.length > 0 && <div className="ghead"><span>{language === 'en' ? `Completed · ${doneResults.length}` : `완료됨 · ${doneResults.length}`}</span></div>}{doneResults.map((task) => <button className="srow donem" data-act="search-go" key={task.id} onClick={() => onSearchResult?.(task)}><span className="rankc">#{(task.doneAt ?? 0) + 1}</span><span className="stt">{markText(task.title, query)}</span><span className="dtime">{task.completedAt ? new Date(task.completedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ko-KR') : ''}</span></button>)}</> : <div className="empty"><div className="empty-c"><h3>{t(language, 'noSearch')}</h3></div></div> : <div className="empty"><div className="empty-c"><h3>{t(language, 'searchEmpty')}</h3></div></div>}</div></div></div> }
  if (selecting) return <div className="selection-view"><div className="selhead"><button className="selx" aria-label={t(language, 'selectCancel')} data-act="sel-cancel" onClick={onCancelSelect}>×</button><b>{selected.size ? (language === 'en' ? `${selected.size} selected` : `${selected.size}개 선택됨`) : (language === 'en' ? 'Select items' : '항목을 선택하세요')}</b><button className="seltxt" data-act="sel-all" onClick={onSelectAll}>{t(language, 'selectAll')}</button></div><div className="stage"><div className="scroller selscroll"><div className="list">{active.map((task) => card(task, 0, { showRank: false, reorderable: false }))}</div></div></div><div className="seldock"><button className="dbtn" data-act="sel-cancel" onClick={onCancelSelect}>{t(language, 'selectCancel')}</button>{circle && <button className="dbtn" onClick={() => setAssignOpen(!assignOpen)}>{t(language, 'assign')}</button>}<button className="dbtn del" data-act="sel-delete" disabled={!selected.size} onClick={onDeleteSelected}>{t(language, 'delete')}{selected.size ? ` · ${selected.size}` : ''}</button>{assignOpen && <div className="bulk-asg">{members.filter((member) => !member.leftAt).map((member) => <button key={member.id} onClick={() => onAssignSelected(member.id)}>{member.emoji} {member.name}</button>)}</div>}</div></div>

  return <>{circle && <CircleFilters members={members} value={filter} onChange={onFilter} unread={circle.memberUnread} language={language} />}<div className={`stage q${queue.dragging ? ' dragging' : ''}${reorder ? ' reordering' : ''}${queue.edge ? ` edge-${queue.edge}` : ''}`} style={{ '--edge-pull': queue.edgeAmount, '--queue-center-shift': circle ? '-27px' : '0px' }} {...queue.gestureProps}><div className="qvp" ref={queue.scrollerRef} {...queue.scrollProps}><div className="qtrack" ref={queue.trackRef} style={{ top: 'calc(50% + var(--queue-center-shift))', transform: `translate3d(0,${-(renderCurrentSlot.y + trackAnchorOffset)}px,0)` }}>{model.rows.map((row) => { const shift = reorder ? 2 : (row.y >= renderCurrentSlot.y ? 81 : 2); const style = { top: `${row.y + shift}px` }; if (row.kind === 'task') { let translate = 0; if (reorder) { if (row.task.id === reorder.id) translate = reorder.offset; else if (reorder.from < reorder.to && row.globalIndex > reorder.from && row.globalIndex <= reorder.to) translate = -H.task; else if (reorder.from > reorder.to && row.globalIndex >= reorder.to && row.globalIndex < reorder.from) translate = H.task } return <div className={`queue-task-row${row.task.id === draggingId ? ' reorder-dragging' : ''}`} data-task-id={row.task.id} data-task-index={row.globalIndex} key={row.key} style={{ ...style, transform: `translate3d(0,${translate}px,0)` }}>{card(row.task, liveIndex(row.globalIndex, row.task.id), { reorderable: !circle || !filter })}</div> } if (row.kind === 'ghost') { const who = members.find((member) => assignees(row.task).includes(member.id)); return <div className="ghostrow" key={row.key} style={style}><span className="grank">#{row.globalIndex + 1}</span><span className="gtitle">{row.task.title}</span>{who && <span className="who">{who.emoji}</span>}</div> } if (row.kind === 'bundle') return <button className="bundle" data-act="bundle" key={row.key} style={style} onClick={() => setExpanded(row.key)}>{language==='en'?<><b>{row.count}</b> more · #{row.from + 1}–#{row.to}</>:<><b>{row.count}개</b> 숨김 · #{row.from + 1}–#{row.to}</>}</button>; if (row.kind === 'collapse') return <button className="colbar" data-act="collapse" key={row.key} style={style} onClick={() => setExpanded(null)}>{language==='en'?`∧ Collapse (#${row.from + 1}–#${row.to})`:`#${row.from + 1}–#${row.to} 접기`}</button>; if (row.kind === 'ad') return <div className="adcard" data-ad-anchor={row.globalIndex} key={row.key} style={style}><span className="adtag">AD</span><div className="adthumb" /><div className="admid"><p>{language === 'en' ? 'Your ad could be here' : '여기에 광고가 표시됩니다'}</p><p className="adsub">{language === 'en' ? 'In-feed native · excluded from ranks' : '인피드 네이티브 · 끼우 번호에서 제외'}</p></div></div>; return <button className="donebtn" data-act="sheet-open" key={row.key} style={style} onClick={onCompleted}>✓ {t(language, 'done', row.count)}</button> })}</div>{!reorder && <div className="queue-floating-layer queue-composer-wrap" style={{ top: 'calc(50% + 30px + var(--queue-center-shift))' }}><Composer count={active.length} circle={circle} members={members} position={currentSlot.globalIndex} onAdd={(title, assignee, position, mode) => { const next = fullModel.slots.findIndex((item) => item.globalIndex >= currentSlot.globalIndex + 1); if (next >= 0) queue.setIndex(next); onAdd(title, assignee, position, mode) }} onOpenChange={setComposerOpen} language={language} /></div>}<div className="queue-scroll-space" style={{ height: `calc(100% + ${fullModel.total}px)` }} aria-hidden="true" /></div>{!active.length && <div className="queueempty"><div className="empty-c"><h3>{t(language, 'empty')}</h3></div></div>}<div className="queue-edge-feedback" aria-hidden="true" /><div className="qfade t" /><div className="qfade b" /></div></>
}
