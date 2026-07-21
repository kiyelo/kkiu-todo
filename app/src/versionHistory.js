export const REACT_VERSION = '1.3.8'
export const HTML_ORACLE_VERSION = '18.4.8'

export const VERSION_HISTORY = [
  { version:'1.3.8', time:'2026-07-21 13:18 KST', title:'총체적 QA·모바일 접근성', changes:['기능·플로우·UX 25개 통합 회귀 검증','320px·390px 14개 화면 오버플로 검증','끼리 멤버 재정렬 터치 영역 40px로 확대','모달 의미 구조와 영문 수정 노트 보강'] },
  { version:'1.3.7', time:'2026-07-21 13:10 KST', title:'초대·프로필·버전 기록', changes:['16자리 고유 초대 코드와 중복 재시도','초대 메시지 공유·코드 복사·딥링크 복원','끼리 생성·가입 시 프로필 이름과 이모지 필수','더보기에 React 버전과 전체 수정 노트 표시'] },
  { version:'1.3.6', time:'2026-07-21 13:02 KST', title:'입력 슬롯·바텀시트 안정화', changes:['큐 위치 피드백 루프 제거','광고 위·아래 동일 순번 슬롯 위치 유지','바텀시트 터치 관통과 즉시 닫힘 방지'] },
  { version:'1.3.5', time:'2026-07-21 12:53 KST', title:'카드 재정렬 안정화', changes:['재정렬 중 입력 UI와 광고 숨김','고정 중심 좌표와 10px 히스테리시스 적용','원위치 복귀·실시간 순번·햅틱 유지'] },
  { version:'1.3.4', time:'2026-07-21 12:10 KST', title:'광고 슬롯·영문·더보기', changes:['HTML v18.4.8 영문 문구 동기화','광고 위·아래 독립 삽입 위치','재정렬 햅틱과 실시간 순번','더보기 진입 위치 상단 초기화'] },
  { version:'1.3.3', time:'2026-07-21 11:52 KST', title:'핸들·강조·슬롯 효과', changes:['끼리 필터의 개인 핸들 상태 누수 수정','검색과 신규 카드 강조 디자인 분리','7종 이모지별 3매치 효과'] },
  { version:'1.3.2', time:'2026-07-21 11:35 KST', title:'HTML 제스처 동등성', changes:['6점 핸들·170ms 활성화·8px 취소','460ms 선택 롱탭과 스크롤 취소','더보기 가변 슬롯과 pair/triple 효과','프로필 설정 모달과 불투명 표면 복원'] },
  { version:'1.3.1', time:'2026-07-21 10:45 KST', title:'모바일 터치 드래그', changes:['카드와 메뉴 표면에서 큐 드래그','가변 슬롯 실시간 계산','드래그 후 합성 클릭 차단'] },
  { version:'1.3.0', time:'2026-07-21 10:05 KST', title:'HTML 의도 기반 기능 동등성', changes:['가변 높이 큐와 전역 삽입 순번','끼리 ghost·bundle·선택 화면','완료 그룹·검색 강조·읽음 처리','Supabase 완료 순번·읽음 영수증·RPC'] },
  { version:'1.2.0', time:'2026-07-21 09:20 KST', title:'심층 기능·시각 회귀', changes:['기능 회귀 29개와 심층 상호작용 검증','인증·핵심 상태·시각 MAE 재검증','HTML v18.4.8 기준 React 구조 정리'] },
  { version:'1.1.0', time:'2026-07-20 22:40 KST', title:'v18.4.8 전체 플로우 이식', changes:['홈·끼리·검색·완료·더보기 이식','추가·복원·선택·정렬·초대·백업 연결','Supabase 초대·멤버 순서·설정 마이그레이션'] },
  { version:'1.0.0', time:'2026-07-20 18:00 KST', title:'폐기', changes:['기능·시각 회귀 기준 미달로 배포 제외'] },
]

const EN_HISTORY = {
 '1.3.8':['Comprehensive QA and mobile accessibility',['Verified 25 functional, flow, and UX paths','Checked 14 screens at 320px and 390px for overflow','Expanded Circle member reorder targets to 40px','Improved dialog semantics and English release notes']],
 '1.3.7':['Invites, profiles, and version history',['Added 16-character invite codes with collision retries','Added invite sharing, code copy, and deep-link recovery','Required a profile name and emoji when creating or joining a Circle','Added React version and full release notes to More']],
 '1.3.6':['Composer and sheet stability',['Removed the queue-position feedback loop','Kept matching insertion positions above and below ads','Prevented touch-through and instant sheet dismissal']],
 '1.3.5':['Task reorder stability',['Hid composer and ads while reordering','Added fixed center coordinates and 10px hysteresis','Preserved original-position return, live numbering, and haptics']],
 '1.3.4':['Ad slots, English, and More',['Synced English copy with HTML v18.4.8','Added independent insertion positions around ads','Added reorder haptics and live numbering','Reset More to the top on entry']],
 '1.3.3':['Handles, highlights, and slot effects',['Stopped Circle filters from leaking into Home handles','Separated search and new-task highlights','Added unique triple-match effects for seven emoji']],
 '1.3.2':['HTML gesture parity',['Restored the six-dot handle, 170ms arm, and 8px cancel threshold','Restored 460ms selection long-press with scroll cancellation','Added variable More slots and pair/triple effects','Restored profile editor and opaque surfaces']],
 '1.3.1':['Mobile touch dragging',['Enabled queue dragging from cards and menu surfaces','Calculated variable slots in real time','Blocked synthetic clicks after dragging']],
 '1.3.0':['Intent-based HTML parity',['Added variable-height queue and global insertion order','Added Circle ghost, bundle, and selection views','Added completion groups, search highlights, and read receipts','Added Supabase completion order, receipts, and RPC support']],
 '1.2.0':['Deep functional and visual regression',['Verified 29 functional and deep-interaction paths','Rechecked authentication, core states, and visual MAE','Aligned the React structure to HTML v18.4.8']],
 '1.1.0':['Full v18.4.8 flow port',['Ported Home, Circle, search, completed tasks, and More','Connected add, restore, selection, sort, invite, and backup flows','Added Supabase invite, member-order, and settings migration']],
 '1.0.0':['Retired build',['Excluded from release after failing functional and visual regression thresholds']]
}
export function localizedVersionHistory(language='ko'){
 if(language!=='en') return VERSION_HISTORY
 return VERSION_HISTORY.map(entry=>{const localized=EN_HISTORY[entry.version];return localized?{...entry,title:localized[0],changes:localized[1]}:entry})
}
