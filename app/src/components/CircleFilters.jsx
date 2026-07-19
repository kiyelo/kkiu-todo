export default function CircleFilters({ members, value, onChange, unread = {} }) {
  return <div className="filter-strip" aria-label="담당자 필터">
    <button className={!value ? 'filter-chip selected' : 'filter-chip'} onClick={() => onChange(null)}><span>👥</span><b>전체</b></button>
    {members.map((member) => <button key={member.id} className={value === member.id ? 'filter-chip selected' : 'filter-chip'} onClick={() => onChange(member.id)}><span>{member.emoji}</span><b>{member.name}{unread[member.id] ? <i /> : null}</b></button>)}
  </div>
}
