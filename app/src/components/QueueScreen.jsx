import { useEffect, useState } from 'react'
import CircleFilters from './CircleFilters.jsx'
import Composer from './Composer.jsx'
import TaskCard from './TaskCard.jsx'
import useFloatingQueue from '../hooks/useFloatingQueue.js'

export default function QueueScreen({ tasks, members, circle, circleMode, onCreateCircle, query, onQuery, filter, onFilter, onAdd, onComplete, onEdit, onAssignee, onMove, onMoveTo, selecting, selected, onSelect, onLongPress, onSelectAll, onDeleteSelected, onAssignSelected, onCancelSelect }) {
  const [draggingId, setDraggingId] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)

  useEffect(() => {
    if (!selecting) setAssignOpen(false)
  }, [selecting])

  const active = tasks.filter((task) => !task.done)
  const filtered = circle && filter
    ? active.filter((task) => task.assignee === filter)
    : active
  const normalized = query?.trim().toLowerCase() || ''
  const searchResults = tasks.filter((task) => task.title.toLowerCase().includes(normalized))
  const queue = useFloatingQueue(filtered.length, filtered.length)

  const moveDrag = (event) => {
    if (!draggingId) return
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-task-id]')
      ?.dataset.taskId
    if (target && target !== draggingId) onMoveTo(draggingId, target)
  }

  const endDrag = () => setDraggingId(null)

  const insertionPosition = filter && filtered[queue.index]
    ? active.findIndex((task) => task.id === filtered[queue.index].id)
    : filter && queue.index >= filtered.length
      ? active.length
      : queue.index

  if (circleMode && !circle) {
    return (
      <main className="screen-scroll">
        <section className="empty-state">
          <span>👥</span>
          <h2>공유 할 일 목록을 만들어보세요</h2>
          <button className="empty-action" onClick={onCreateCircle}>새 끼리 만들기</button>
        </section>
      </main>
    )
  }

  if (query !== null) {
    return (
      <main className="screen-scroll search-scroll">
        <div className="search-box">
          <input
            autoFocus
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="검색어"
          />
        </div>
        <div className="queue-list search-results">
          {searchResults.length ? searchResults.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              members={members}
              circle={circle}
              showRank={!task.done}
              onComplete={onComplete}
              onEdit={onEdit}
              onAssignee={onAssignee}
              onMove={onMove}
              onDragStart={setDraggingId}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
              dragging={draggingId === task.id}
              reorderable={false}
              selecting={selecting}
              selected={selected.has(task.id)}
              onSelect={onSelect}
              onLongPress={onLongPress}
            />
          )) : (
            <section className="empty-state"><span>✓</span><h2>검색 결과가 없어요</h2></section>
          )}
        </div>
      </main>
    )
  }

  return (
    <>
      {circle && (
        <CircleFilters
          members={members}
          value={filter}
          onChange={onFilter}
          unread={circle.memberUnread}
        />
      )}

      <main
        className={queue.dragging ? 'floating-queue-stage is-dragging' : 'floating-queue-stage'}
        {...queue.gestureProps}
      >
        <div className="queue-fade queue-fade-top" />
        <div className="queue-fade queue-fade-bottom" />

        <div
          className="floating-queue-track"
          style={{
            transform: `translate3d(0, calc(-${queue.index * queue.rowHeight}px + ${queue.dragY}px), 0)`,
          }}
        >
          {filtered.map((task, index) => (
            <div
              key={task.id}
              className="queue-position"
              style={{ top: `${index * queue.rowHeight - 8}px` }}
            >
              <TaskCard
                task={task}
                index={index}
                members={members}
                circle={circle}
                onComplete={onComplete}
                onEdit={onEdit}
                onAssignee={onAssignee}
                onMove={onMove}
                onDragStart={setDraggingId}
                onDragMove={moveDrag}
                onDragEnd={endDrag}
                dragging={draggingId === task.id}
                reorderable={!filter}
                selecting={selecting}
                selected={selected.has(task.id)}
                onSelect={onSelect}
                onLongPress={onLongPress}
              />
            </div>
          ))}
        </div>

        {!filtered.length && (
          <div className="queue-empty-copy">
            {filter ? '이 담당자의 할 일이 없어요' : '할 일이 없어요'}
          </div>
        )}

        <Composer
          count={filtered.length}
          circle={circle}
          members={members}
          position={queue.index}
          onAdd={(title, assignee) => onAdd(title, assignee, insertionPosition)}
        />
      </main>

      {selecting && (
        <>
          <div className="selection-bar">
            <button onClick={onCancelSelect}>취소</button>
            <b>{selected.size}개 선택</b>
            <button onClick={onSelectAll}>전체</button>
            {circle && <button onClick={() => setAssignOpen((value) => !value)}>담당</button>}
            <button className="danger" disabled={!selected.size} onClick={onDeleteSelected}>삭제</button>
          </div>
          {assignOpen && circle && (
            <div className="bulk-assignee">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    onAssignSelected(member.id)
                    setAssignOpen(false)
                  }}
                >
                  <span>{member.emoji}</span>{member.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
