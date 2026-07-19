const settings = [
  { id: 'compact', icon: '↕️', label: '촘촘하게 보기', kind: 'toggle' },
  { id: 'motion', icon: '✨', label: '화면 움직임', kind: 'toggle' },
  { id: 'notifications', icon: '🔔', label: '알림', kind: 'toggle' },
]

export default function MoreScreen({ values, onToggle }) {
  return <main className="screen-scroll more-screen"><div className="menu-list">
    <section className="menu-group"><h2>앱 설정</h2>{settings.map((item) => <button className="menu-card" key={item.id} onClick={() => onToggle(item.id)}><span>{item.icon}</span><b>{item.label}</b><i className={values[item.id] ? 'switch on' : 'switch'}><u /></i></button>)}</section>
    <section className="menu-group"><h2>계정</h2><button className="menu-card"><span>🙂</span><b>내 프로필</b><i>›</i></button><button className="menu-card"><span>🔒</span><b>개인정보 및 보안</b><i>›</i></button><button className="menu-card"><span>☁️</span><b>데이터 동기화</b><i>›</i></button></section>
    <section className="menu-group"><h2>지원</h2><button className="menu-card"><span>💬</span><b>의견 보내기</b><i>›</i></button><button className="menu-card"><span>🛡️</span><b>개인정보처리방침</b><i>›</i></button></section>
    <a className="prototype-link" href="./kkiu4-v18-ux-fixes.html">v18.4.8 기준 목업 보기</a>
    <p className="version">React 전환판 · 0.3.0</p>
  </div></main>
}
