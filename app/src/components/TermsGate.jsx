import { useId, useState } from 'react'
import { REQUIRED_TERMS, recordTermsAcceptance } from '../services/termsRepository.js'
import DialogSurface from './DialogSurface.jsx'

const TERMS_URL = 'https://kkiu.3dayweekendlab.com/terms/'
const PRIVACY_URL = 'https://kkiu.3dayweekendlab.com/privacy/'

const LABELS = {
  ko: {
    terms_of_service: '[필수] 이용약관',
    privacy_policy: '[필수] 개인정보처리방침',
    heading: '시작하기 전에 확인해 주세요',
    sub: '서비스 이용을 위해 필수 약관을 확인하고 동의해 주세요.',
    view: '보기',
    submit: '동의하고 시작하기',
    busy: '저장 중…',
    error: '동의 내용을 저장하지 못했어요. 다시 시도해주세요.',
  },
  en: {
    terms_of_service: '[Required] Terms of Service',
    privacy_policy: '[Required] Privacy Policy',
    heading: 'Before you start',
    sub: 'Please review and accept the required terms to continue.',
    view: 'View',
    submit: 'Agree and continue',
    busy: 'Saving…',
    error: 'Could not save your consent. Please try again.',
  },
}

function ExternalPageConfirmModal({ kind, language, onClose }) {
  const en = language === 'en'
  const titleId = useId()
  const messageId = useId()
  const isTerms = kind === 'terms'
  const title = isTerms ? (en ? 'Terms of service' : '이용약관') : (en ? 'Privacy policy' : '개인정보처리방침')
  const url = isTerms ? TERMS_URL : PRIVACY_URL
  const openPage = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <DialogSurface role="alertdialog" labelledBy={titleId} describedBy={messageId} scrimLabel={en ? 'Cancel' : '취소'} onClose={onClose}>
      <h3 id={titleId}>{title}</h3>
      <p id={messageId} className="confirm-message">{en ? `The Kkiu ${isTerms ? 'terms of service' : 'privacy policy'} page will open in your browser.` : `끼우 홈페이지의 ${title} 페이지로 이동해요.`}</p>
      <div className="mrow">
        <button className="mbtn" onClick={onClose}>{en ? 'Cancel' : '취소'}</button>
        <button className="mbtn primary" onClick={openPage}>{en ? 'Open page' : '이동하기'}</button>
      </div>
    </DialogSurface>
  )
}

export default function TermsGate({ userId, language = 'ko', onAccepted }) {
  const text = LABELS[language] || LABELS.ko
  const [checked, setChecked] = useState(() => Object.fromEntries(REQUIRED_TERMS.map((type) => [type, false])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [externalDoc, setExternalDoc] = useState(null)
  const canSubmit = REQUIRED_TERMS.every((type) => checked[type]) && !busy

  const toggle = (type) => setChecked((current) => ({ ...current, [type]: !current[type] }))

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await recordTermsAcceptance(userId, REQUIRED_TERMS)
      onAccepted()
    } catch {
      setError(text.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="terms-gate">
      <div className="terms-gate-card">
        <h2>{text.heading}</h2>
        <p className="terms-gate-sub">{text.sub}</p>
        <div className="terms-gate-list">
          {REQUIRED_TERMS.map((type) => {
            const kind = type === 'terms_of_service' ? 'terms' : 'privacy'
            return (
              <div key={type} className="terms-gate-item">
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked[type]} onChange={() => toggle(type)} />
                  <span>{text[type]}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setExternalDoc(kind)}
                  style={{ marginLeft: 'auto', flex: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 800 }}
                >
                  {text.view} <span aria-hidden="true">›</span>
                </button>
              </div>
            )
          })}
        </div>
        {error && <p className="terms-gate-error">{error}</p>}
        <button type="button" className="terms-gate-submit" disabled={!canSubmit} onClick={submit}>
          {busy ? text.busy : text.submit}
        </button>
      </div>
      {externalDoc && <ExternalPageConfirmModal kind={externalDoc} language={language} onClose={() => setExternalDoc(null)} />}
    </div>
  )
}
