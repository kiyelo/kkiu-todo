import { REACT_VERSION } from '../versionHistory.js'

// TODO: 실제 운영 문의 주소로 교체하세요.
const CONTACT_EMAIL = 'contact@kkiu.app'

const DOCS = {
 terms: {
  ko: [
   { h: '제1조 (목적)', p: '이 약관은 끼우(kkiu) 서비스의 이용 조건과 절차를 정합니다. 서비스를 이용하면 이 약관에 동의한 것으로 봅니다.' },
   { h: '제2조 (서비스 내용)', list: ['할 일 기록·정리 및 순서 관리 기능', '끼리(그룹)를 통한 할 일 공유 기능', '서비스는 무료로 제공되며, 기능은 사전 고지 후 변경될 수 있습니다'] },
   { h: '제3조 (계정)', list: ['이메일로 로그인할 수 있으며, 로그인 없이도 이 기기에서 사용할 수 있습니다', '계정 정보의 관리 책임은 이용자에게 있습니다'] },
   { h: '제4조 (이용자의 의무)', list: ['타인의 정보를 도용하거나 부정하게 사용하지 않습니다', '서비스 운영을 방해하는 행위를 하지 않습니다'] },
   { h: '제5조 (데이터)', p: '이용자가 입력한 할 일 데이터의 권리는 이용자에게 있습니다. 중요한 데이터는 더보기 > 데이터 백업으로 수시로 보관해 주세요.' },
   { h: '제6조 (책임의 한계)', p: '무료로 제공되는 서비스 특성상, 서비스 중단·데이터 유실 등으로 발생한 손해에 대해 관련 법령이 허용하는 범위에서 책임이 제한됩니다.' },
   { h: '제7조 (약관 변경)', p: '약관이 변경되는 경우 앱 내 수정 노트 또는 공지로 안내합니다.' },
  ],
  en: [
   { h: 'Article 1 (Purpose)', p: 'These terms define the conditions for using the kkiu service. By using the service you agree to these terms.' },
   { h: 'Article 2 (Service)', list: ['Recording, organizing, and ordering to-dos', 'Sharing to-dos through circles (groups)', 'The service is free and features may change with prior notice'] },
   { h: 'Article 3 (Account)', list: ['You can sign in with email, or use the app on this device without signing in', 'You are responsible for keeping your account information safe'] },
   { h: 'Article 4 (User obligations)', list: ['Do not impersonate others or misuse their information', 'Do not interfere with the operation of the service'] },
   { h: 'Article 5 (Data)', p: 'You own the to-do data you enter. Please back up important data regularly via More > Back up data.' },
   { h: 'Article 6 (Limitation of liability)', p: 'As a free service, liability for interruptions or data loss is limited to the extent permitted by applicable law.' },
   { h: 'Article 7 (Changes)', p: 'When these terms change, we will announce it in the in-app release notes or a notice.' },
  ],
 },
 privacy: {
  ko: [
   { h: '수집하는 정보', list: ['이메일 주소(로그인 시)', '할 일·끼리 데이터(제목, 담당자, 순서, 완료 기록)', '기기 설정(언어, 알림, 테마)'] },
   { h: '이용 목적', list: ['로그인 및 계정 식별', '기기 간 할 일 동기화', '끼리 구성원 간 할 일 공유'] },
   { h: '보관 및 파기', p: '로그인 사용 시 데이터는 Supabase 서버와 이 기기의 로컬 저장소에 보관됩니다. 로그인하지 않으면 이 기기에만 저장됩니다. 계정 삭제 요청 시 지체 없이 파기합니다.' },
   { h: '제3자 제공', p: '수집한 정보를 제3자에게 판매하거나 제공하지 않습니다.' },
   { h: '문의', p: '개인정보 관련 문의는 더보기 > 문의하기로 연락해 주세요.' },
  ],
  en: [
   { h: 'Data we collect', list: ['Email address (when signing in)', 'To-do and circle data (titles, assignees, order, completion records)', 'Device settings (language, notifications, theme)'] },
   { h: 'How we use it', list: ['Sign-in and account identification', 'Syncing to-dos across devices', 'Sharing to-dos between circle members'] },
   { h: 'Storage and deletion', p: 'When signed in, data is stored on Supabase servers and cached on this device. Without an account, data stays only on this device. Data is deleted promptly upon account deletion requests.' },
   { h: 'Third parties', p: 'We never sell or share collected information with third parties.' },
   { h: 'Contact', p: 'For privacy questions, reach out via More > Contact us.' },
  ],
 },
}

function Doc({ sections }) {
 return <div className="info-doc">{sections.map((section) => <section key={section.h}><h4>{section.h}</h4>{section.p && <p>{section.p}</p>}{section.list && <ul>{section.list.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</div>
}

function AccountView({ user, language, onSignOut, onClose }) {
 const en = language === 'en'
 return <div className="info-doc">
  <section><h4>{en ? 'Signed-in account' : '로그인 계정'}</h4><p className="info-strong">{user?.email || (en ? 'Not signed in · stored on this device only' : '로그인하지 않음 · 이 기기에만 저장 중')}</p></section>
  <section><h4>{en ? 'Where your data lives' : '데이터 저장 위치'}</h4><p>{user ? (en ? 'Your to-dos sync to the kkiu cloud (Supabase) and are cached on this device.' : '할 일이 끼우 클라우드(Supabase)에 동기화되고, 이 기기에도 캐시돼요.') : (en ? 'All to-dos are stored only in this browser. Back up before switching devices.' : '모든 할 일이 이 브라우저에만 저장돼요. 기기를 바꾸기 전에 백업해 주세요.')}</p></section>
  <section><h4>{en ? 'Manage' : '관리'}</h4><ul><li>{en ? 'Back up or restore data anytime from the More tab.' : '더보기 탭에서 언제든 데이터를 백업·복원할 수 있어요.'}</li><li>{en ? 'Clearing the app or browser data removes local to-dos.' : '앱/브라우저 데이터를 지우면 이 기기의 할 일이 사라져요.'}</li></ul></section>
  {user && onSignOut && <button className="mbtn info-signout" data-act="signout" onClick={() => { onClose?.(); onSignOut() }}>{en ? 'Sign out' : '로그아웃'}</button>}
 </div>
}

function ContactView({ language }) {
 const en = language === 'en'
 return <div className="info-doc">
  <section><h4>{en ? 'Email' : '이메일 문의'}</h4><p><a className="info-mail" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(en ? `kkiu feedback (v${REACT_VERSION})` : `끼우 문의 (v${REACT_VERSION})`)}`}>{CONTACT_EMAIL}</a></p><p>{en ? 'We usually reply within 2–3 business days.' : '보통 영업일 기준 2~3일 안에 답변드려요.'}</p></section>
  <section><h4>{en ? 'Reporting a bug?' : '버그 제보 팁'}</h4><ul><li>{en ? 'Include what you did and what you expected.' : '어떤 동작을 했고, 어떻게 되길 기대했는지 적어 주세요.'}</li><li>{en ? 'Attaching a backup file (More > Back up data) helps a lot.' : '백업 파일(더보기 > 데이터 백업)을 함께 보내 주시면 큰 도움이 돼요.'}</li><li>{en ? `App version: v${REACT_VERSION}` : `앱 버전: v${REACT_VERSION}`}</li></ul></section>
 </div>
}

export default function InfoModal({ kind, user, language = 'ko', onClose, onSignOut }) {
 const en = language === 'en'
 const titles = { account: en ? 'Account' : '계정 관리', terms: en ? 'Terms of service' : '이용약관', privacy: en ? 'Privacy policy' : '개인정보처리방침', contact: en ? 'Contact us' : '문의하기' }
 const kickers = { account: 'ACCOUNT', terms: 'TERMS', privacy: 'PRIVACY', contact: 'CONTACT' }
 return <div className="modalwrap on"><button className="scrim" aria-label={en ? 'Close' : '닫기'} data-act="modal-cancel" onClick={onClose} /><div className="modal history-modal info-modal" role="dialog" aria-modal="true" aria-labelledby="info-modal-title"><div className="release-head"><div><span>{kickers[kind]}</span><h3 id="info-modal-title">{titles[kind]}</h3></div><b>v{REACT_VERSION}</b></div><div className="release-list info-body">{kind === 'account' ? <AccountView user={user} language={language} onSignOut={onSignOut} onClose={onClose} /> : kind === 'contact' ? <ContactView language={language} /> : <Doc sections={DOCS[kind][en ? 'en' : 'ko']} />}</div><div className="mrow"><button className="mbtn primary" data-act="modal-cancel" onClick={onClose}>{en ? 'Close' : '닫기'}</button></div></div></div>
}
