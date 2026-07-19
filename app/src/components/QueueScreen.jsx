import CircleFilters from './CircleFilters.jsx'
import Composer from './Composer.jsx'
import TaskCard from './TaskCard.jsx'
import { useEffect, useState } from 'react'

export default function QueueScreen({ tasks, members, circle, circleMode, onCreateCircle, query, onQuery, filter, onFilter, onAdd, onComplete, onEdit, onAssignee, onMove, onMoveTo, selecting, selected, onSelect, onLongPress, onSelectAll, onDeleteSelected, onAssignSelected, onCancelSelect }) {
  const [draggingId, setDraggingId] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  useEffect(() => { if (!selecting) setAssignOpen(false) }, [selecting])
  const active = tasks.filter((task) => !task.done)
  const filtered = circle && filter ? active.filter((task) => task.assignee === filter) : active
  const normalized = query?.trim().toLowerCase() || ''
  const visible = query !== null
    ? tasks.filter((task) => task.title.toLowerCase().includes(normalized))
    : filtered
  const moveDrag = (event) => {
    if (!draggingId) return
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-task-id]')?.dataset.taskId
    if (target && target !== draggingId) onMoveTo(draggingId, target)
  }
  const endDrag = () => setDraggingId(null)

  return (
    <>
      {circle && query === null && <CircleFilters members={members} value={filter} onChange={onFilter} unread={circle.memberUnread} />}
      <main className="screen-scroll">
        {query !== null && <div className="search-box"><input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="검색어" /></div>}
        <div className="queue-list">
          {circleMode && !circle ? <section className="empty-state"><span>👥</span><h2>아직 끼리가 없어요</h2><button className="empty-action" onClick={onCreateCircle}>새 끼리 만들기</button></section> : <>
          {visible.length ? visible.map((task, index) => <TaskCard key={task.id} task={task} index={index} members={members} circle={circle} showRank={query === null || !task.done} onComplete={onComplete} onEdit={onEdit} onAssignee={onAssignee} onMove={onMove} onDragStart={setDraggingId} onDragMove={moveDrag} onDragEnd={endDrag} dragging={draggingId === task.id} reorderable={query === null && !filter} selecting={selecting} selected={selected.has(task.id)} onSelect={onSelect} onLongPress={onLongPress} />) : (
            <section className="empty-state"><span>✓</span><h2>{query ? '검색 결과가 없어요' : filter ? '이 담당자의 할 일이 없어요' : '할 일이 없어요'}</h2></section>
          )}
          {query === null && <Composer count={filtered.length} circle={circle} members={members} onAdd={onAdd} />}
          </>}
        </div>
      </main>
      {selecting && <><div className="selection-bar"><button onClick={onCancelSelect}>취소</button><b>{selected.size}개 선택</b><button onClick={onSelectAll}>전체</button>{circle && <button onClick={() => setAssignOpen((value) => !value)}>담당</button>}<button className="danger" disabled={!selected.size} onClick={onDeleteSelected}>삭제</button></div>{assignOpen && circle && <div className="bulk-assignee">{members.map((member) => <button key={member.id} onClick={() => { onAssignSelected(member.id); setAssignOpen(false) }}><span>{member.emoji}</span>{member.name}</button>)}</div>}</>}
    </>
  )
}
