export const getDefaultLanguage = () => {
  if (typeof navigator === 'undefined') return 'en'
  const locale = navigator.languages?.[0] || navigator.language || ''
  return /^ko(?:-|$)/i.test(locale) ? 'ko' : 'en'
}

export const tx = {
  ko: {
    home: '할 일', circle: '끼리', more: '더보기', search: '검색', closeSearch: '검색 닫기', completed: '완료된 할 일', manage: '끼리 관리', all: '전체',
    insert: n => `${n}번째에 할일 끼우기`, placeholder: '할 일을 입력하고 끼우기', empty: '할 일이 없어요', searchPlaceholder: '검색어', searchEmpty: '무엇을 찾을까요?', searchHint: '찾고 싶은 할 일을 입력하세요', noSearch: '결과가 없어요', done: n => `완료됨 ${n}개 보기`,
    selectCancel: '취소', selectAll: '전체 선택', assign: '담당', delete: '삭제', account: '계정', accountManage: '계정 관리', soon: '예정', notification: '알림 설정', preferences: '환경', language: '언어 / Language', terms: '이용약관 · 개인정보', contact: '문의하기', data: '데이터', reset: '전체 초기화', testTools: '테스트 도구', seed: '테스트 데이터 넣기', emptyData: '테스트 데이터 빼기', unread: '테스트 알림 띄우기', version: '버전', history: '수정 이력',
    authTitle: '끼우 투두', authHero: '할 일을 순서대로, 가볍게 관리하세요.', authGoogle: 'Google 계정으로 로그인', authMoving: '이동 중…', authLoginHint: '같은 Google 계정으로 웹과 앱에서 이어서 사용할 수 있어요.', authExpired: '로그인 링크가 만료됐거나 이미 사용됐어요. 다시 시도해주세요.', authFailed: '로그인에 실패했어요.', authProblem: '로그인 중 문제가 생겼어요.',
  },
  en: {
    home: 'Queue', circle: 'Circle', more: 'More', search: 'Search', closeSearch: 'Close search', completed: 'Completed', manage: 'Manage circle', all: 'All',
    insert: n => `Add to queue at #${n}`, placeholder: 'Type a to-do and insert', empty: 'No tasks yet', searchPlaceholder: 'Search term', searchEmpty: 'What are you looking for?', searchHint: 'Type to search tasks', noSearch: 'No results', done: n => `View ${n} done`,
    selectCancel: 'Cancel', selectAll: 'Select all', assign: 'Assign', delete: 'Delete', account: 'ACCOUNT', accountManage: 'Account', soon: 'soon', notification: 'Notifications', preferences: 'PREFERENCES', language: '언어 / Language', terms: 'Terms · Privacy', contact: 'Contact', data: 'DATA', reset: 'Reset all', testTools: 'TEST TOOLS', seed: 'Add test data', emptyData: 'Remove test data', unread: 'Show test notification', version: 'Version', history: 'Update history',
    authTitle: 'KKiu Todo', authHero: 'Keep your to-dos in order, without the clutter.', authGoogle: 'Sign in with Google', authMoving: 'Opening…', authLoginHint: 'Use the same Google account across the web and app.', authExpired: 'This sign-in link has expired or was already used. Please try again.', authFailed: 'Sign-in failed.', authProblem: 'Something went wrong while signing in.',
  },
}

export const t = (lang, key, ...args) => {
  const pack = tx[lang] || tx[getDefaultLanguage()] || tx.en
  const value = pack[key]
  return value instanceof Function ? value(...args) : (value || key)
}
