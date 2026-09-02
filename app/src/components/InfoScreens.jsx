import { useState } from 'react'
import { REACT_VERSION } from '../versionHistory.js'
import { ConfirmDialog } from './Sheets.jsx'
import { deleteMyAccount } from '../services/supabaseRepository.js'
import DialogSurface from './DialogSurface.jsx'

function AccountView({ user, language, onSignOut, onClose }) {
 const en = language === 'en'
 const [confirmingDelete, setConfirmingDelete] = useState(false)
 const [deletingAccount, setDeletingAccount] = useState(false)
 const [deleteError, setDeleteError] = useState(null)

 const handleSignOut = () => {
  onClose?.()
  onSignOut?.()
 }

 const handleDeleteAccount = async () => {
  if (deletingAccount) return
  setDeletingAccount(true)
  setDeleteError(null)
  try {
   await deleteMyAccount()
   setConfirmingDelete(false)
   onClose?.()
   onSignOut?.()
  } catch (err) {
   setDeletingAccount(false)
   setDeleteError(en
    ? 'Failed to delete your account. Please try again.'
    : '회원 탈퇴에 실패했어요. 다시 시도해 주세요.')
  }
 }

 return <div className="info-doc">
  <div className="account-manage-actions">
   <button type="button" className="rbtn" data-act="account-signout" onClick={handleSignOut}>
    <span className="mlead"><span>{en ? 'Sign out' : '로그아웃'}</span></span><span aria-hidden="true">›</span>
   </button>
   {user && <button type="button" className="rbtn danger" data-act="account-delete" disabled={deletingAccount} onClick={() => setConfirmingDelete(true)}>
    <span className="mlead"><span>{en ? 'Delete account' : '회원 탈퇴'}</span></span><span aria-hidden="true">›</span>
   </button>}
  </div>
  {deleteError && <p className="account-danger-error" role="alert">{deleteError}</p>}
  {confirmingDelete && (
   <ConfirmDialog
    title={en ? 'Delete account' : '회원 탈퇴'}
    message={en
     ? 'Deleting your account permanently removes your personal to-dos and account information. Some Circle records you created or were assigned to may remain so the shared group can continue operating.'
     : '회원 탈퇴 시 개인 할 일과 계정 정보가 삭제되며 복구할 수 없습니다. 끼리에서 내가 작성하거나 담당한 할 일은 그룹 운영을 위해 일부 기록이 남을 수 있습니다.'}
    confirmLabel={en ? 'Delete account' : '회원 탈퇴'}
    danger
    language={language}
    onCancel={() => { if (!deletingAccount) setConfirmingDelete(false) }}
    onConfirm={handleDeleteAccount}
   />
  )}
 </div>
}

const LICENSES = [
 { name: 'React / React DOM', license: 'MIT', url: 'https://github.com/facebook/react' },
 { name: 'Vite', license: 'MIT', url: 'https://github.com/vitejs/vite' },
 { name: 'Supabase JavaScript', license: 'MIT', url: 'https://github.com/supabase/supabase-js' },
 { name: 'Lucide React', license: 'ISC', url: 'https://github.com/lucide-icons/lucide' },
 { name: 'Capacitor', license: 'MIT', url: 'https://github.com/ionic-team/capacitor' },
]

function LicensesView({ language }) {
 const en = language === 'en'
 return <div className="info-doc"><section><h4>{en ? 'Open-source software' : '오픈소스 소프트웨어'}</h4><p>{en ? 'Kkiu is built with the following open-source projects.' : '끼우는 다음 오픈소스 프로젝트를 사용해 만들었습니다.'}</p><ul>{LICENSES.map((item) => <li key={item.name}><a className="info-mail" href={item.url} target="_blank" rel="noreferrer">{item.name}</a> · {item.license}</li>)}</ul></section></div>
}

export default function InfoModal({ kind, user, language = 'ko', onClose, onSignOut }) {
 const en = language === 'en'
 const account = kind === 'account'
 const titles = { account: en ? 'Account management' : '계정 관리', licenses: en ? 'Open-source licenses' : '오픈소스 라이선스' }
 const kickers = { account: 'ACCOUNT', licenses: 'LICENSES' }
 return <DialogSurface className="history-modal info-modal" labelledBy="info-modal-title" scrimLabel={en ? 'Close' : '닫기'} onClose={onClose}><div className="release-head"><div><span>{kickers[kind]}</span><h3 id="info-modal-title">{titles[kind]}</h3></div>{!account&&<b>v{REACT_VERSION}</b>}</div><div className="release-list info-body">{account ? <AccountView user={user} language={language} onSignOut={onSignOut} onClose={onClose} /> : <LicensesView language={language} />}</div><div className="mrow"><button className="mbtn primary" data-act="modal-cancel" onClick={onClose}>{en ? 'Close' : '닫기'}</button></div></DialogSurface>
}
