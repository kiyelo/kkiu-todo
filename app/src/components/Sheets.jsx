export function Sheet({ title, children, onClose }) {
  return <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={title}>
    <button className="sheet-scrim" onClick={onClose} aria-label="닫기" />
    <section className="sheet-panel"><div className="sheet-grab" /><header><h2>{title}</h2><button onClick={onClose}>완료</button></header>{children}</section>
  </div>
}

export function CirclePicker({ circles, selected, onSelect, onClose }) {
  return <Sheet title="끼리 선택" onClose={onClose}><div className="sheet-list">
    {circles.map((circle) => <button key={circle.id} className={selected === circle.id ? 'sheet-row selected' : 'sheet-row'} onClick={() => onSelect(circle.id)}><span className="sheet-emoji">{circle.emoji}</span><div><b>{circle.name}</b><small>할 일 {circle.tasks.filter((task) => !task.done).length}개</small></div>{circle.unread > 0 && <i className="row-badge">{circle.unread}</i>}</button>)}
    <button className="sheet-row add-circle"><span className="sheet-emoji">＋</span><div><b>새 끼리 만들기</b><small>공유 할 일 목록을 만들어보세요</small></div></button>
  </div></Sheet>
}

export function CompletedSheet({ tasks, members, circle, onRestore, onClear, onClose }) {
  return <Sheet title={`완료된 할 일 ${tasks.length}`} onClose={onClose}><div className="sheet-list completed-sheet">
    {tasks.length ? tasks.map((task) => <article className="completed-card" key={task.id}><button onClick={() => onRestore(task.id)} aria-label="다시 할 일로"><span>✓</span></button><div><p>{task.title}</p><small>{task.completedAt ? new Date(task.completedAt).toLocaleDateString('ko-KR') : '완료됨'}</small></div>{circle && <i>{members.find((member) => member.id === task.assignee)?.emoji}</i>}</article>) : <div className="sheet-empty">완료된 할 일이 없어요</div>}
    {tasks.length > 0 && <button className="clear-completed" onClick={onClear}>완료된 할 일 전체 비우기</button>}
  </div></Sheet>
}
