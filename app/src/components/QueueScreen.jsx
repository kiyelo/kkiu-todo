import Composer from './Composer.jsx'
import TaskCard from './TaskCard.jsx'

export default function QueueScreen({ tasks, members, circle, query, onAdd, onComplete, onEdit, onAssignee }) {
  const active = tasks.filter((task) => !task.done)
  const visible = query ? active.filter((task) => task.title.toLowerCase().includes(query.toLowerCase())) : active
  const completed = tasks.filter((task) => task.done)
  return (
    <main className="screen-scroll">
      {query !== null && <div className="search-box"><input autoFocus value={query} onChange={(event) => event.currentTarget.dispatchEvent(new CustomEvent('querychange', { bubbles: true, detail: event.target.value }))} placeholder="검색어" /></div>}
      <div className="queue-list">
        {visible.length ? visible.map((task, index) => <TaskCard key={task.id} task={task} index={index} members={members} circle={circle} onComplete={onComplete} onEdit={onEdit} onAssignee={onAssignee} />) : (
          <section className="empty-state"><span>✓</span><h2>{query ? '검색 결과가 없어요' : '할 일이 없어요'}</h2></section>
        )}
        {query === null && <Composer count={active.length} circle={circle} members={members} onAdd={onAdd} />}
        {query === null && completed.length > 0 && <details className="completed"><summary>완료된 할 일 {completed.length}</summary>{completed.map((task) => <div key={task.id} className="completed-row"><span>✓</span><p>{task.title}</p></div>)}</details>}
      </div>
    </main>
  )
}
