import { useMemo, useRef, useState } from 'react'
import useFloatingQueue from '../hooks/useFloatingQueue.js'

const icons={account:'👤',bell:'🔔',shield:'🛡️',mail:'✉️',reset:'⟲',starter:'↺',remove:'⌫',unread:'!'}

function Row({icon,label,tail='›',onClick,danger=false,sub}){
 return <button className={`rbtn more-row${danger?' danger':''}`} onClick={onClick}><span className="mlead"><span className="mrank">{icon}</span><span>{label}{sub&&<em>{sub}</em>}</span></span><span>{tail}</span></button>
}

export default function MoreScreen({values,onToggle,user,onSignOut,language='ko',onLanguage,onBackup,onRestore,onReset}){
 const fileRef=useRef(null),[locked,setLocked]=useState(false),[symbols,setSymbols]=useState(['🌙','🍊','🌿']),[history,setHistory]=useState(false)
 const restore=e=>{const file=e.target.files?.[0];if(file)onRestore?.(file)}
 const resetLocal=()=>onReset?.()
 const items=useMemo(()=>[
  {h:82,node:<div className="more-qsection"><p className="more-section-label">계정</p><Row icon={icons.account} label="계정 관리" sub={user?.email||'예정'} /></div>},
  {h:64,node:<Row icon={icons.bell} label="알림 설정" sub={values.notifications?'사용':'끔'} onClick={()=>onToggle('notifications')} />},
  {h:116,node:<div className="more-qsection"><p className="more-section-label">환경</p><div className="pcard more-language"><div className="mlead"><span className="mrank">🌐</span><h3>언어 / Language</h3></div><div className="more-langbar"><button className={`more-lang${language==='ko'?' on':''}`} onClick={()=>onLanguage?.('ko')}>한국어</button><button className={`more-lang${language==='en'?' on':''}`} onClick={()=>onLanguage?.('en')}>English</button></div></div></div>},
  {h:64,node:<Row icon={icons.shield} label="이용약관 · 개인정보" />},
  {h:64,node:<Row icon={icons.mail} label="문의하기" />},
  {h:24,node:<div className="more-divider"/>},
  {h:82,node:<div className="more-qsection"><p className="more-section-label">데이터</p><Row icon={icons.reset} label="전체 초기화" tail="⟲" onClick={resetLocal} danger /></div>},
  {h:64,node:<Row icon="⬇️" label="데이터 백업" onClick={onBackup} />},
  {h:64,node:<Row icon="⬆️" label="데이터 복원" onClick={()=>fileRef.current?.click()} />},
  {h:82,node:<div className="more-qsection"><p className="more-section-label">테스트 도구</p><Row icon={icons.starter} label="초기 데이터로 리셋" tail="⟲" onClick={resetLocal} /></div>},
  {h:64,node:<Row icon={icons.remove} label="모든 데이터 제거" onClick={resetLocal} danger />},
  {h:64,node:<Row icon={icons.unread} label="안읽음 뱃지 생성" tail="•" />},
  {h:54,node:<button className="more-version" onClick={()=>setHistory(true)}>버전 v18.4.8 <span>·</span><span>수정 이력</span><span>›</span></button>},
  ...(user?[{h:54,node:<button className="more-version signout" onClick={onSignOut}>로그아웃</button>}]:[])
 ],[values.notifications,user,language,onToggle,onLanguage,onBackup,onReset,onSignOut])
 const positions=[];let cursor=0;items.forEach(item=>{positions.push(cursor);cursor+=item.h+8})
 const q=useFloatingQueue(items.length,2,{rowHeight:72});const offset=positions[Math.min(q.index,positions.length-1)]||0
 const roll=()=>{if(locked){setLocked(false);setSymbols(symbols.map(()=>['🌙','🍊','🌿','🔥','⭐'][Math.floor(Math.random()*5)]))}else setLocked(true)}
 return <div className="stage q more-qstage" {...q.gestureProps}><div className="qvp"><div className="qtrack more-qtrack" style={{top:'50%',transform:`translate3d(0,calc(-${offset}px + ${q.dragY}px),0)`}}>{items.map((item,i)=><div className="more-qitem" key={i} style={{top:`${positions[i]+36}px`}}>{item.node}</div>)}</div></div><div className="qfade t"/><div className="qfade b"/><div className="slotwrap" style={{top:'50%'}}><button className={`ins quip emoji-slot-btn${locked?' locked':''}`} onClick={roll}><span className="emoji-reels">{symbols.map((s,i)=><i className="emoji-reel" key={i}>{s}</i>)}</span><span className="slot-mode">{locked?'🔒':'↻'}</span></button></div><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={restore}/>{history&&<div className="modalwrap on"><button className="scrim" onClick={()=>setHistory(false)}/><div className="modal"><h3>수정 이력</h3><p>v18.4.8 목업 동등성 기준 React 전환판</p><div className="mrow"><button className="mbtn primary" onClick={()=>setHistory(false)}>닫기</button></div></div></div>}</div>
}
