import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFloatingQueue from '../hooks/useFloatingQueue.js'
import { HTML_ORACLE_VERSION, REACT_VERSION, localizedVersionHistory } from '../versionHistory.js'
import InfoModal from './InfoScreens.jsx'
import DialogSurface from './DialogSurface.jsx'
import { checkNotificationPermission, ensureNotificationChannel, openNotificationSettings } from '../services/notificationPlatform.js'

const icons = {
  account: '👤', bell: '🔔', theme: '◐', feedback: '◎', language: '🌐',
  contact: '✉️', shield: '🛡️', privacy: '🔏', license: '⌘', notes: '✦',
  backup: '↓', restore: '↑', reset: '⟲', starter: '↺', remove: '⌫', unread: '!',
}
const SLOT_KEY = 'kkiu-more-slot-v1'
const CONTACT_FORM_URL = import.meta.env.VITE_CONTACT_FORM_URL || 'https://forms.gle/9Ljt3w7MaNJfumLb8'
const showDevelopmentTools = import.meta.env.DEV || new URLSearchParams(window.location.search).has('qa')

const loadSlot = () => {
  try {
    return JSON.parse(localStorage.getItem(SLOT_KEY)) || { locked: false, symbols: ['🌙', '🍊', '🌿'] }
  } catch {
    return { locked: false, symbols: ['🌙', '🍊', '🌿'] }
  }
}

const providerLabel = (user, language) => {
  const provider = user?.app_metadata?.provider || user?.app_metadata?.providers?.[0] || 'email'
  const labels = language === 'en'
    ? { google: 'Google', apple: 'Apple', kakao: 'Kakao', email: 'Email' }
    : { google: 'Google 로그인', apple: 'Apple 로그인', kakao: '카카오 로그인', email: '이메일 로그인' }
  return labels[provider] || provider
}

function Row({ icon, label, tail = '›', onClick, danger = false, sub, action }) {
  return (
    <button type="button" className={`rbtn more-row${danger ? ' danger' : ''}`} data-act={action} onClick={onClick}>
      <span className="mlead"><span className="mrank" aria-hidden="true">{icon}</span><span>{label}{sub && <em>{sub}</em>}</span></span>
      <span aria-hidden="true">{tail}</span>
    </button>
  )
}

function Toggle({ checked, label, onChange }) {
  return <button type="button" className={`setting-switch${checked ? ' on' : ''}`} role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}><i /></button>
}

function SettingCard({ icon, label, children, action }) {
  return <div className="pcard more-setting-card" data-act={action}><div className="mlead"><span className="mrank" aria-hidden="true">{icon}</span><h3>{label}</h3></div>{children}</div>
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="more-langbar" role="radiogroup" aria-label={label}>
      {options.map((option) => <button type="button" role="radio" key={option.value} aria-checked={value === option.value} className={`more-lang${value === option.value ? ' on' : ''}`} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  )
}

function ReleaseNotesModal({ language, onClose }) {
  const en = language === 'en'
  return <DialogSurface className="history-modal" labelledBy="release-notes-title" scrimLabel={en ? 'Close' : '닫기'} onClose={onClose}><div className="release-head"><div><span>REACT</span><h3 id="release-notes-title">{en ? 'Release notes' : '수정 노트'}</h3></div><b>v{REACT_VERSION}</b></div><div className="release-list">{localizedVersionHistory(language).map((entry) => <article className="release-entry" key={entry.version}><div className="release-meta"><b>v{entry.version}</b><time>{entry.time}</time></div><h4>{entry.title}</h4><ul>{entry.changes.map((change) => <li key={change}>{change}</li>)}</ul></article>)}</div><div className="mrow"><button className="mbtn primary" onClick={onClose}>{en ? 'Close' : '닫기'}</button></div></DialogSurface>
}

function NotificationModal({ values, onSetting, language, onClose }) {
  const en = language === 'en'
  const titleId = useId()
  const descriptionId = useId()
  const [permission, setPermission] = useState('unknown')

  useEffect(() => {
    let cancelled = false
    const readPermission = async () => {
      try {
        await ensureNotificationChannel()
        const result = await checkNotificationPermission()
        if (!cancelled) setPermission(result)
      } catch {
        if (!cancelled) setPermission('unknown')
      }
    }
    readPermission()
    return () => { cancelled = true }
  }, [])

  const openSystemSettings = async () => {
    try {
      setPermission(await openNotificationSettings())
    } catch {
      setPermission('unknown')
    }
  }
  const blocked = permission === 'denied'

  return (
    <DialogSurface className="notification-modal" labelledBy={titleId} describedBy={descriptionId} scrimLabel={en ? 'Close notification settings' : '알림 설정 닫기'} onClose={onClose}>
      <h3 id={titleId}>{en ? 'Notification settings' : '알림 설정'}</h3>
      <p id={descriptionId}>{en ? 'Get updates about Circle to-dos related to you.' : '나와 관련된 끼리 할 일을 알려드려요.'}</p>
      {blocked && <p className="notification-permission-warning" role="status">{en ? 'Notifications are disabled in system settings.' : '시스템 설정에서 알림 권한이 꺼져 있어요.'}</p>}
      <div className="notification-setting-list">
        <div><span><b>{en ? 'Allow notifications' : '알림 받기'}</b></span><Toggle checked={Boolean(values.notifications)} label={en ? 'Allow notifications' : '알림 받기'} onChange={(next) => onSetting('notifications', next)} /></div>
        <div><span><b>{en ? 'Service notices' : '서비스 안내'}</b><small>{en ? 'Important maintenance and service updates' : '중요 점검, 필수 업데이트, 운영 변경'}</small></span><Toggle checked={Boolean(values.serviceNotifications)} label={en ? 'Service notices' : '서비스 안내'} onChange={(next) => onSetting('serviceNotifications', next)} /></div>
      </div>
      <button type="button" className="system-settings-button" onClick={openSystemSettings}>{en ? 'Open system notification settings' : '시스템 알림 설정 열기'} <span aria-hidden="true">↗</span></button>
      <div className="mrow"><button className="mbtn primary" onClick={onClose}>{en ? 'Done' : '완료'}</button></div>
    </DialogSurface>
  )
}

function ContactConfirmModal({ language, onClose }) {
  const en = language === 'en'
  const titleId = useId()
  const messageId = useId()
  const openForm = () => {
    window.open(CONTACT_FORM_URL, '_blank', 'noopener,noreferrer')
    onClose()
  }
  return (
    <DialogSurface role="alertdialog" labelledBy={titleId} describedBy={messageId} scrimLabel={en ? 'Cancel' : '취소'} onClose={onClose}>
      <h3 id={titleId}>{en ? 'Contact us' : '문의하기'}</h3>
      <p id={messageId} className="confirm-message">{en ? 'The Kkiu contact form will open in Google Forms.' : '구글 폼의 끼우 문의 페이지로 이동해요.'}</p>
      <div className="mrow"><button className="mbtn" onClick={onClose}>{en ? 'Cancel' : '취소'}</button><button className="mbtn primary" onClick={openForm}>{en ? 'Contact us' : '문의하기'}</button></div>
    </DialogSurface>
  )
}

export default function MoreScreen({ values, onSetting, user, onSignOut, language = 'ko', onBackup, onRestore, onReset, onSeed, onEmpty, onUnread, testMode = false, onExitTestMode }) {
  const fileRef = useRef(null)
  const lastQueueIndex = useRef(null)
  const entryAlignedRef = useRef(false)
  const rollTimer = useRef(null)
  const hitTimer = useRef(null)
  const initial = useMemo(loadSlot, [])
  const [locked, setLocked] = useState(initial.locked)
  const [symbols, setSymbols] = useState(initial.symbols)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState(false)
  const [heights, setHeights] = useState([])
  const [hit, setHit] = useState(false)
  const [doc, setDoc] = useState(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const en = language === 'en'
  const provider = user ? providerLabel(user, language) : (en ? 'No account' : '로그인하지 않음')

  useEffect(() => { localStorage.setItem(SLOT_KEY, JSON.stringify({ locked, symbols })) }, [locked, symbols])
  const restore = (event) => { const file = event.target.files?.[0]; if (file) onRestore?.(file); event.target.value = '' }
  const themeOptions = en
    ? [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]
    : [{ value: 'system', label: '시스템 설정' }, { value: 'light', label: '라이트' }, { value: 'dark', label: '다크' }]

  const items = useMemo(() => {
    const result = [
      { h: 116, node: <section className="more-account-summary" aria-label={en ? 'Signed-in account' : '로그인 계정'}><span className="mrank" aria-hidden="true">{icons.account}</span><div><small>{provider}</small><strong>{user?.email || (en ? 'Stored on this device' : '이 기기에만 저장 중')}</strong></div></section> },
      { h: 82, node: <div className="more-qsection"><p className="more-section-label">{en ? 'SETTINGS' : '설정'}</p><Row action="notifications" icon={icons.bell} label={en ? 'Notification settings' : '알림 설정'} sub={values.notifications ? (en ? 'On' : '켜짐') : (en ? 'Off' : '꺼짐')} onClick={() => setNotificationsOpen(true)} /></div> },
      { h: 126, node: <SettingCard action="theme" icon={icons.theme} label={en ? 'Display mode' : '화면 모드'}><Segmented label={en ? 'Display mode' : '화면 모드'} value={values.theme} options={themeOptions} onChange={(next) => onSetting('theme', next)} /></SettingCard> },
      { h: 72, node: <SettingCard action="interaction-feedback" icon={icons.feedback} label={en ? 'Interaction feedback' : '조작 피드백'}><Toggle checked={Boolean(values.interactionFeedback)} label={en ? 'Interaction feedback' : '조작 피드백'} onChange={(next) => onSetting('interactionFeedback', next)} /></SettingCard> },
      { h: 126, node: <SettingCard action="language" icon={icons.language} label={en ? 'Language' : '언어'}><Segmented label={en ? 'Language' : '언어'} value={language} options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} onChange={(next) => onSetting('language', next)} /></SettingCard> },
      { h: 82, node: <div className="more-qsection"><p className="more-section-label">{en ? 'SUPPORT' : '고객지원'}</p><Row action="contact" icon={icons.contact} label={en ? 'Contact us' : '문의하기'} onClick={() => setContactOpen(true)} /></div> },
      { h: 82, node: <div className="more-qsection"><p className="more-section-label">{en ? 'SERVICE INFO' : '서비스 정보'}</p><Row action="terms" icon={icons.shield} label={en ? 'Terms of service' : '이용약관'} onClick={() => setDoc('terms')} /></div> },
      { h: 64, node: <Row action="privacy" icon={icons.privacy} label={en ? 'Privacy policy' : '개인정보처리방침'} onClick={() => setDoc('privacy')} /> },
      { h: 64, node: <Row action="licenses" icon={icons.license} label={en ? 'Open-source licenses' : '오픈소스 라이선스'} onClick={() => setDoc('licenses')} /> },
      { h: 64, node: <Row action="history" icon={icons.notes} label={en ? 'Release notes' : '수정 노트'} onClick={() => setHistory(true)} /> },
      { h: 82, node: <div className="more-qsection"><p className="more-section-label">{en ? 'DATA' : '데이터'}</p><Row action="backup" icon={icons.backup} label={en ? 'Back up data' : '데이터 백업'} onClick={onBackup} /></div> },
      { h: 64, node: <Row action="restore-data" icon={icons.restore} label={en ? 'Restore data' : '데이터 복원'} onClick={() => fileRef.current?.click()} /> },
      { h: 82, node: <div className="more-qsection"><p className="more-section-label">{en ? 'ACCOUNT' : '계정'}</p><Row action="account" icon={icons.account} label={en ? 'Account information' : '계정 정보'} sub={provider} onClick={() => setDoc('account')} /></div> },
      ...(user ? [{ h: 54, node: <button className="more-version signout" data-act="signout" onClick={onSignOut}>{en ? 'Sign out' : '로그아웃'}</button> }] : []),
      { h: 48, node: <div className="more-app-version" aria-label={`${en ? 'Kkiu version' : '끼우 버전'} ${REACT_VERSION}`}>Kkiu v{REACT_VERSION}</div> },
    ]
    if (showDevelopmentTools) {
      result.push(
        { h: 30, node: <div className="more-divider" /> },
        { h: testMode ? 116 : 82, node: <div className="more-qsection"><p className="more-section-label">{en ? 'DEVELOPMENT' : '개발 전용'}</p>{testMode && <button className="test-mode-banner" data-act="test-exit" onClick={onExitTestMode}>{en ? 'Screen test mode · Return to server data' : '화면 테스트 모드 · 서버 데이터로 돌아가기'}</button>}<Row action="test-seed" icon={icons.starter} label={en ? 'Add test data' : '테스트 데이터 넣기'} tail="⟲" onClick={onSeed || onReset} /></div> },
        { h: 64, node: <Row action="test-empty" icon={icons.remove} label={en ? 'Remove test data' : '빈 데이터 만들기'} onClick={onEmpty || onReset} danger /> },
        { h: 64, node: <Row action="test-unread" icon={icons.unread} label={en ? 'Show unread state' : '읽지 않음 상태 테스트'} tail="•" onClick={onUnread} /> },
        { h: 64, node: <Row action="reset" icon={icons.reset} label={en ? 'Reset data' : '데이터 초기화'} tail="⟲" onClick={onReset} danger /> },
      )
    }
    return result
  }, [en, language, onBackup, onEmpty, onExitTestMode, onReset, onSeed, onSetting, onSignOut, onUnread, provider, testMode, themeOptions, user, values.interactionFeedback, values.notifications, values.theme])

  const positions = []
  let cursor = 0
  items.forEach((item, index) => { positions.push(cursor); cursor += (heights[index] || item.h) + 10 })
  const slotPositions = [...positions, cursor]
  const queue = useFloatingQueue(items.length, 0, {
    positions: slotPositions,
    rowHeight: 72,
    ariaLabel: en ? 'Settings position' : '설정 목록 위치',
    ariaValueText: (current, total) => en ? `Position ${current} of ${total}` : `전체 ${total}곳 중 ${current}번째`,
  })
  const offset = slotPositions[Math.min(queue.index, slotPositions.length - 1)] || 0

  useLayoutEffect(() => {
    const next = [...(queue.trackRef.current?.querySelectorAll('.more-qitem') || [])].map((element) => Math.ceil(element.getBoundingClientRect().height))
    if (next.length && (next.length !== heights.length || next.some((height, index) => height !== heights[index]))) setHeights(next)
  }, [items, language, user, heights, queue.trackRef])

  useLayoutEffect(() => {
    if (entryAlignedRef.current || heights.length !== items.length || !queue.scrollerRef.current) return
    const target = queue.scrollerRef.current.clientHeight / 2 + 2
    let entryIndex = 0
    slotPositions.forEach((position, index) => {
      if (position <= target) entryIndex = index
    })
    entryAlignedRef.current = true
    queue.setIndex(entryIndex)
  }, [heights.length, items.length, queue, slotPositions])

  const spin = () => {
    const pool = ['🌙', '🍊', '🌿', '🔥', '🐈', '🧦', '🐸']
    const next = [0, 1, 2].map(() => pool[Math.floor(Math.random() * pool.length)])
    const isTriple = next[0] === next[1] && next[1] === next[2]
    setSymbols(next); setHit(false); setRolling(true)
    window.clearTimeout(rollTimer.current); window.clearTimeout(hitTimer.current)
    rollTimer.current = window.setTimeout(() => { setRolling(false); if (isTriple) { setHit(true); hitTimer.current = window.setTimeout(() => setHit(false), 500) } }, 220)
  }
  useEffect(() => {
    if (lastQueueIndex.current === null) { lastQueueIndex.current = queue.index; return }
    if (lastQueueIndex.current !== queue.index) { lastQueueIndex.current = queue.index; if (!locked) spin() }
  }, [queue.index, locked])
  useEffect(() => () => { window.clearTimeout(rollTimer.current); window.clearTimeout(hitTimer.current) }, [])
  const roll = () => { if (locked) { setLocked(false); spin() } else setLocked(true) }
  const counts = symbols.reduce((map, symbol) => ({ ...map, [symbol]: (map[symbol] || 0) + 1 }), {})
  const max = Math.max(...Object.values(counts))
  const combo = max === 3 ? 'triple' : max === 2 ? 'pair' : 'mixed'
  const symbolClass = combo === 'triple' ? ({ '🔥': ' symbol-fire', '🌙': ' symbol-moon', '🍊': ' symbol-orange', '🌿': ' symbol-leaf', '🐈': ' symbol-cat', '🧦': ' symbol-sock', '🐸': ' symbol-frog' }[symbols[0]] || '') : ''

  return <div className={`stage q more-queue-stage entry-settled${queue.dragging ? ' dragging' : ''}${queue.edge ? ` edge-${queue.edge}` : ''}`} style={{ '--edge-pull': queue.edgeAmount }} {...queue.gestureProps}><div className="qvp" ref={queue.scrollerRef} {...queue.scrollProps}><div ref={queue.trackRef} className="qtrack more-qtrack" style={{ top: '50%', transform: `translate3d(0,${-offset}px,0)` }}>{items.map((item, index) => <div className="more-qitem" key={index} style={{ top: `${positions[index] + (positions[index] >= offset ? 81 : 2)}px` }}>{item.node}</div>)}</div><div className="queue-scroll-space" style={{ height: `calc(100% + ${cursor}px)` }} aria-hidden="true" /></div><div className="queue-edge-feedback" aria-hidden="true" /><div className="qfade t" /><div className="qfade b" /><div className="slotwrap" style={{ top: 'calc(50% + 30px)' }}><button className={`ins quip emoji-slot-btn combo-${combo}${locked ? ' locked' : ''}${rolling ? ' rolling' : ''}${hit ? ' trigger' : ''}${symbolClass}`} data-act="quip-next" aria-label={en ? 'Toggle emoji slot lock' : '이모지 슬롯 잠금 전환'} onClick={roll}><span className="emoji-reels">{symbols.map((symbol, index) => <i className={`emoji-reel${counts[symbol] > 1 ? ' matched' : ''}`} key={index}>{symbol}</i>)}</span><span className="slot-mode">{locked ? '🔒' : '↻'}</span></button></div><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={restore} />{doc && <InfoModal kind={doc} user={user} language={language} onClose={() => setDoc(null)} onSignOut={onSignOut} />}{history && <ReleaseNotesModal language={language} onClose={() => setHistory(false)} />}{notificationsOpen && <NotificationModal values={values} onSetting={onSetting} language={language} onClose={() => setNotificationsOpen(false)} />}{contactOpen && <ContactConfirmModal language={language} onClose={() => setContactOpen(false)} />}</div>
}
