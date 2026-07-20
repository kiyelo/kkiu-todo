import { CircleIcon, HomeIcon, MoreIcon } from './Icons.jsx'
const items = [{ id: 'home', label: '끼우', Icon: HomeIcon }, { id: 'circle', label: '끼리', Icon: CircleIcon }, { id: 'more', label: '더보기', Icon: MoreIcon }]
export default function BottomNav({ tab, unread, onChange }) {
  const index = Math.max(0, items.findIndex((item) => item.id === tab))
  return <nav className="bottom-nav" aria-label="주요 메뉴"><i className="nav-indicator" style={{ transform: `translateX(${index * 100}%)` }} />{items.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(id)}><span className="nav-icon"><Icon />{id === 'circle' && unread > 0 && <i>{unread > 99 ? '99+' : unread}</i>}</span><span>{label}</span></button>)}</nav>
}
