import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFloatingQueue from '../hooks/useFloatingQueue.js'
import {t} from '../i18n.js'
import { HTML_ORACLE_VERSION, REACT_VERSION, localizedVersionHistory } from '../versionHistory.js'
import InfoModal from './InfoScreens.jsx'

const icons={account:'👤',bell:'🔔',shield:'🛡️',mail:'✉️',reset:'⟲',starter:'↺',remove:'⌫',unread:'!'}
const SLOT_KEY='kkiu-more-slot-v1'
const loadSlot=()=>{try{return JSON.parse(localStorage.getItem(SLOT_KEY))||{locked:false,symbols:['🌙','🍊','🌿']}}catch{return{locked:false,symbols:['🌙','🍊','🌿']}}}

function Row({icon,label,tail='›',onClick,danger=false,sub,action}){
 return <button className={`rbtn more-row${danger?' danger':''}`} data-act={action} onClick={onClick}><span className="mlead"><span className="mrank">{icon}</span><span>{label}{sub&&<em>{sub}</em>}</span></span><span>{tail}</span></button>
}

export default function MoreScreen({values,onToggle,user,onSignOut,language='ko',onLanguage,onBackup,onRestore,onReset,onSeed,onEmpty,onUnread}){
 const fileRef=useRef(null),trackRef=useRef(null),stageRef=useRef(null),entryAligned=useRef(false),lastQueueIndex=useRef(null),rollTimer=useRef(null),hitTimer=useRef(null),initial=useMemo(loadSlot,[]),[locked,setLocked]=useState(initial.locked),[symbols,setSymbols]=useState(initial.symbols),[rolling,setRolling]=useState(false),[history,setHistory]=useState(false),[heights,setHeights]=useState([]),[hit,setHit]=useState(false),[doc,setDoc]=useState(null)
 useEffect(()=>{localStorage.setItem(SLOT_KEY,JSON.stringify({locked,symbols}))},[locked,symbols])
 const restore=e=>{const file=e.target.files?.[0];if(file)onRestore?.(file);e.target.value=''}
 const items=useMemo(()=>[
  {h:82,node:<div className="more-qsection"><p className="more-section-label">{t(language,'account')}</p><Row action="account" icon={icons.account} label={t(language,'accountManage')} sub={user?.email||t(language,'soon')} onClick={()=>setDoc('account')}/></div>},
  {h:64,node:<Row action="notifications" icon={icons.bell} label={t(language,'notification')} sub={values.notifications?(language==='en'?'On':'사용'):(language==='en'?'Off':'끔')} onClick={()=>onToggle('notifications')}/>},
  {h:116,node:<div className="more-qsection"><p className="more-section-label">{t(language,'preferences')}</p><div className="pcard more-language"><div className="mlead"><span className="mrank">🌐</span><h3>{t(language,'language')}</h3></div><div className="more-langbar"><button data-act="lang" className={`more-lang${language==='ko'?' on':''}`} onClick={()=>onLanguage?.('ko')}>한국어</button><button data-act="lang" className={`more-lang${language==='en'?' on':''}`} onClick={()=>onLanguage?.('en')}>English</button></div></div></div>},
  {h:64,node:<Row action="terms" icon={icons.shield} label={t(language,'terms')} onClick={()=>setDoc('terms')}/>},
  {h:64,node:<Row action="privacy" icon="🔏" label={language==='en'?'Privacy policy':'개인정보처리방침'} onClick={()=>setDoc('privacy')}/>},
  {h:64,node:<Row action="contact" icon={icons.mail} label={t(language,'contact')} onClick={()=>setDoc('contact')}/>},
  {h:24,node:<div className="more-divider"/>},
  {h:82,node:<div className="more-qsection"><p className="more-section-label">{t(language,'data')}</p><Row action="reset" icon={icons.reset} label={t(language,'reset')} tail="⟲" onClick={onReset} danger/></div>},
  {h:64,node:<Row action="backup" icon="⬇️" label={language==='en'?'Back up data':'데이터 백업'} onClick={onBackup}/>},
  {h:64,node:<Row action="restore-data" icon="⬆️" label={language==='en'?'Restore data':'데이터 복원'} onClick={()=>fileRef.current?.click()}/>},
  {h:82,node:<div className="more-qsection"><p className="more-section-label">{t(language,'testTools')}</p><Row action="test-seed" icon={icons.starter} label={t(language,'seed')} tail="⟲" onClick={onSeed||onReset}/></div>},
  {h:64,node:<Row action="test-empty" icon={icons.remove} label={t(language,'emptyData')} onClick={onEmpty||onReset} danger/>},
  {h:64,node:<Row action="test-unread" icon={icons.unread} label={t(language,'unread')} tail="•" onClick={onUnread}/>},
  {h:54,node:<button className="more-version" data-act="history" onClick={()=>setHistory(true)}>{language==='en'?'React':'React'} v{REACT_VERSION} <span>·</span><span>HTML v{HTML_ORACLE_VERSION}</span><span>·</span><span>{language==='en'?'Release notes':'수정 노트'}</span><span>›</span></button>},
  ...(user?[{h:54,node:<button className="more-version signout" data-act="signout" onClick={onSignOut}>{language==='en'?'Sign out':'로그아웃'}</button>}]:[])
 ],[values.notifications,user,language,onToggle,onLanguage,onBackup,onReset,onSeed,onEmpty,onUnread,onSignOut])
 useLayoutEffect(()=>{const next=[...(trackRef.current?.querySelectorAll('.more-qitem')||[])].map(el=>Math.ceil(el.getBoundingClientRect().height));if(next.length&&next.some((h,i)=>h!==heights[i]))setHeights(next)},[items,language,user])
 const positions=[];let cursor=0;items.forEach((item,i)=>{positions.push(cursor);cursor+=(heights[i]||item.h)+10})
 const slotPositions=[...positions,cursor]
 const q=useFloatingQueue(items.length,0,{positions:slotPositions,rowHeight:72});const offset=slotPositions[Math.min(q.index,slotPositions.length-1)]||0
 useLayoutEffect(()=>{if(entryAligned.current||heights.length!==items.length||!stageRef.current)return;entryAligned.current=true;const desired=Math.max(0,stageRef.current.clientHeight/2-10);let nearest=0,best=Infinity;slotPositions.forEach((position,index)=>{const distance=Math.abs(position-desired);if(distance<best){best=distance;nearest=index}});q.setIndex(nearest)},[heights.length,items.length])
 const spin=()=>{const pool=['🌙','🍊','🌿','🔥','🐈','🧦','🐸'];const next=[0,1,2].map(()=>pool[Math.floor(Math.random()*pool.length)]);const isTriple=next[0]===next[1]&&next[1]===next[2];setSymbols(next);setHit(false);setRolling(true);window.clearTimeout(rollTimer.current);window.clearTimeout(hitTimer.current);rollTimer.current=window.setTimeout(()=>{setRolling(false);if(isTriple){setHit(true);hitTimer.current=window.setTimeout(()=>setHit(false),500)}},220)}
 useEffect(()=>{if(lastQueueIndex.current===null){lastQueueIndex.current=q.index;return}if(lastQueueIndex.current!==q.index){lastQueueIndex.current=q.index;if(!locked)spin()}},[q.index,locked])
 useEffect(()=>()=>{window.clearTimeout(rollTimer.current);window.clearTimeout(hitTimer.current)},[])
 const roll=()=>{if(locked){setLocked(false);spin()}else setLocked(true)}
 const counts=symbols.reduce((map,symbol)=>({...map,[symbol]:(map[symbol]||0)+1}),{}),max=Math.max(...Object.values(counts)),combo=max===3?'triple':max===2?'pair':'mixed',symbolClass=combo==='triple'?({'🔥':' symbol-fire','🌙':' symbol-moon','🍊':' symbol-orange','🌿':' symbol-leaf','🐈':' symbol-cat','🧦':' symbol-sock','🐸':' symbol-frog'}[symbols[0]]||''):''
 return <div ref={stageRef} className={`stage q more-qstage${q.dragging?' dragging':''}`} {...q.gestureProps}><div className="qvp"><div ref={trackRef} className="qtrack more-qtrack" style={{top:'50%',transform:`translate3d(0,calc(-${offset}px + ${q.dragY}px),0)`}}>{items.map((item,i)=><div className="more-qitem" key={i} style={{top:`${positions[i]+(positions[i]>=offset?81:2)}px`}}>{item.node}</div>)}</div></div><div className="qfade t"/><div className="qfade b"/><div className="slotwrap" style={{top:'calc(50% + 30px)'}}><button className={`ins quip emoji-slot-btn combo-${combo}${locked?' locked':''}${rolling?' rolling':''}${hit?' trigger':''}${symbolClass}`} data-act="quip-next" onClick={roll}><span className="emoji-reels">{symbols.map((s,i)=><i className={`emoji-reel${counts[s]>1?' matched':''}`} key={i}>{s}</i>)}</span><span className="slot-mode">{locked?'🔒':'↻'}</span></button></div><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={restore}/>{doc&&<InfoModal kind={doc} user={user} language={language} onClose={()=>setDoc(null)} onSignOut={onSignOut}/>}{history&&<div className="modalwrap on"><button className="scrim" aria-label={language==='en'?'Close':'닫기'} data-act="modal-cancel" onClick={()=>setHistory(false)}/><div className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="release-notes-title"><div className="release-head"><div><span>REACT</span><h3 id="release-notes-title">{language==='en'?'Release notes':'수정 노트'}</h3></div><b>v{REACT_VERSION}</b></div><div className="release-list">{localizedVersionHistory(language).map(entry=><article className="release-entry" key={entry.version}><div className="release-meta"><b>v{entry.version}</b><time>{entry.time}</time></div><h4>{entry.title}</h4><ul>{entry.changes.map(change=><li key={change}>{change}</li>)}</ul></article>)}</div><div className="mrow"><button className="mbtn primary" onClick={()=>setHistory(false)}>{language==='en'?'Close':'닫기'}</button></div></div></div>}</div>
}
