const groups = [
  { title: '앱', items: [['🎨', '화면 설정'], ['🔔', '알림'], ['🌐', '언어']] },
  { title: '계정', items: [['🙂', '내 프로필'], ['🔒', '개인정보 및 보안'], ['☁️', '데이터 동기화']] },
  { title: '지원', items: [['💬', '의견 보내기'], ['📄', '이용약관'], ['🛡️', '개인정보처리방침']] },
]

export default function MoreScreen() {
  return <main className="screen-scroll more-screen"><div className="menu-list">
    {groups.map((group) => <section className="menu-group" key={group.title}><h2>{group.title}</h2>{group.items.map(([icon, label]) => <button className="menu-card" key={label}><span>{icon}</span><b>{label}</b><i>›</i></button>)}</section>)}
    <a className="prototype-link" href="./kkiu4-v18-ux-fixes.html">v18.4.8 기준 목업 보기</a>
    <p className="version">React 전환판 · 0.1.0</p>
  </div></main>
}
