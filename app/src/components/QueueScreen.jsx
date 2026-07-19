import CircleFilters from './CircleFilters.jsx'
import Composer from './Composer.jsx'
import TaskCard from './TaskCard.jsx'

export default function QueueScreen({ tasks, members, circle, query, onQuery, filter, onFilter, onAdd, onComplete, onEdit, onAssignee }) {
  const active = tasks.filter((task) => !task.done)
  const filtered = circle && filter ? active.filter((task) => task.assignee === filter) : active
  const normalized = query?.trim().toLowerCase() || ''
  const visible = query !== null
    ? tasks.filter((task) => task.title.toLowerCase().includes(normalized))
    : filtered

  return (
    <>
      {circle && query === null && <CircleFilters members={members} value={filter} onChange={onFilter} unread={circle.memberUnread} />}
      <main className="screen-scroll">
        {query !== null && <div className="search-box"><input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="검색어" /></div>}
        <div className="queue-list">
          {visible.length ? visible.map((task, index) => <TaskCard key={task.id} task={task} index={index} members={members} circle={circle} showRank={query === null || !task.done} onComplete={onComplete} onEdit={onEdit} onAssignee={onAssignee} />) : (
            <section className="empty-state"><span>✓</span><h2>{query ? '검색 결과가 없어요' : filter ? '이 담당자의 할 일이 없어요' : '할 일이 없어요'}</h2></section>
          )}
          {query === null && <Composer count={filtered.length} circle={circle} members={members} onAdd={onAdd} />}
        </div>
      </main>
    </>
  )
}
