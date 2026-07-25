import { useState } from 'react'
import { OPTIONAL_TERMS, REQUIRED_TERMS, recordTermsAcceptance } from '../services/termsRepository.js'

const LABELS = {
  ko: {
    terms_of_service: '[필수] 이용약관에 동의합니다',
    privacy_policy: '[필수] 개인정보처리방침에 동의합니다',
    marketing: '[선택] 마케팅 정보 수신에 동의합니다',
    heading: '시작하기 전에 확인해 주세요',
    sub: '서비스 이용을 위해 아래 약관 동의가 필요해요.',
    submit: '동의하고 시작하기',
    busy: '저장 중…',
    error: '동의 내용을 저장하지 못했어요. 다시 시도해주세요.',
  },
  en: {
    terms_of_service: '[Required] I agree to the Terms of Service',
    privacy_policy: '[Required] I agree to the Privacy Policy',
    marketing: '[Optional] I agree to receive marketing messages',
    heading: 'Before you start',
    sub: 'Please accept the terms below to continue.',
    submit: 'Agree and continue',
    busy: 'Saving…',
    error: 'Could not save your consent. Please try again.',
  },
}

const ALL_TERMS = [...REQUIRED_TERMS, ...OPTIONAL_TERMS]

export default function TermsGate({ userId, language = 'ko', onAccepted }) {
  const text = LABELS[language] || LABELS.ko
  const [checked, setChecked] = useState(() => Object.fromEntries(ALL_TERMS.map((type) => [type, false])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = REQUIRED_TERMS.every((type) => checked[type]) && !busy

  const toggle = (type) => setChecked((current) => ({ ...current, [type]: !current[type] }))

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      const accepted = ALL_TERMS.filter((type) => checked[type])
      await recordTermsAcceptance(userId, accepted)
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
          {ALL_TERMS.map((type) => (
            <label key={type} className="terms-gate-item">
              <input type="checkbox" checked={checked[type]} onChange={() => toggle(type)} />
              <span>{text[type]}</span>
            </label>
          ))}
        </div>
        {error && <p className="terms-gate-error">{error}</p>}
        <button type="button" className="terms-gate-submit" disabled={!canSubmit} onClick={submit}>
          {busy ? text.busy : text.submit}
        </button>
      </div>
    </div>
  )
}
