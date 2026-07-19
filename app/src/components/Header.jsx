import { CheckIcon, MoreIcon, SearchIcon } from './Icons.jsx'

export default function Header({ tab, circle, searchOpen, onSearch, onCircleSelect, onCompleted, onManage }) {
  const title = tab === 'home' ? '할 일' : tab === 'circle' ? circle?.name || '끼리' : '더보기'
  return (
    <header className="app-header">
      <div className="header-title-wrap">
        {tab === 'circle' && circle && <span className="circle-mark">{circle.emoji}</span>}
        {tab === 'circle' && circle ? (
          <button className="circle-title" onClick={onCircleSelect} aria-label="끼리 목록 열기">
            <span className="marquee"><span>{title}</span></span><span className="chevron">⌄</span>
          </button>
        ) : <h1>{title}</h1>}
      </div>
      {tab !== 'more' && (
        <div className="header-actions">
          <button className={searchOpen ? 'icon-button active' : 'icon-button'} onClick={onSearch} aria-label={searchOpen ? '검색 닫기' : '검색'}>
            <SearchIcon />
          </button>
          {!searchOpen && <button className="icon-button" onClick={onCompleted} aria-label="완료된 할 일"><CheckIcon /></button>}
          {tab === 'circle' && <button className="icon-button" onClick={onManage} aria-label="끼리 관리"><MoreIcon /></button>}
        </div>
      )}
    </header>
  )
}
