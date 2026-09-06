import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { normalizeInviteCode } from '../services/invite.js'
import { EMOJI_CATEGORIES, flatEmojiCatalog, pushRecentEmoji, readRecentEmojis } from '../emojiCatalog.js'
import OverflowText from './OverflowText.jsx'
import { CIRCLE_NAME_LIMIT, PROFILE_NAME_LIMIT, graphemeLength, limitGraphemes } from '../utils/text.js'
import useHorizontalResistance from '../hooks/useHorizontalResistance.js'
import useDialogA11y from '../hooks/useDialogA11y.js'
import DialogSurface from './DialogSurface.jsx'

export function Sheet({title,subtitle,children,onClose,hideClose=false,language='ko',bodyRef,className='',footer=null}){
 const openedAt=useRef(typeof performance==='undefined'?Date.now():performance.now())
 const titleId=useId()
 const dialogRef=useDialogA11y(onClose)
 const closeFromScrim=(event)=>{event.stopPropagation();const now=typeof performance==='undefined'?Date.now():performance.now();if(event.detail!==0&&now-openedAt.current<360)return;onClose?.()}
 const setBodyRef=(node)=>{if(typeof bodyRef==='function')bodyRef(node);else if(bodyRef)bodyRef.current=node}
 return <div className="sheetwrap on" onPointerDown={event=>event.stopPropagation()}><button className="scrim" aria-label={language==='en'?'Close':'닫기'} data-act="sheet-close" onClick={closeFromScrim}/><section ref={dialogRef} tabIndex={-1} className={`sheet${className?` ${className}`:''}${footer?' has-sheet-footer':''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="grab" aria-hidden="true"/><header className="sheethead"><b id={titleId}>{title}</b>{subtitle&&<div className="mini">{subtitle}</div>}{!hideClose&&<button className="sheetclose" data-act="sheet-close" onClick={onClose} aria-label={language==='en'?'Close':'닫기'}>×</button>}</header><div className="sheetbody" ref={setBodyRef}>{children}</div>{footer}</section></div>
}

function JoinProfileModal({code,onCancel,onJoin,language='ko'}){
 const en=language==='en',[name,setName]=useState(''),[emoji,setEmoji]=useState('🙂'),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const submit=async()=>{if(!name.trim()){setError(en?'Enter your profile name.':'끼리에서 사용할 프로필 이름을 입력해 주세요.');return}setBusy(true);setError('');const ok=await onJoin?.(code,{name:limitGraphemes(name.trim(),PROFILE_NAME_LIMIT),emoji});setBusy(false);if(!ok)setError(en?'Could not join with this code.':'초대 코드를 확인하거나 잠시 후 다시 시도해 주세요.')}
 return <IdentityModal onClose={onCancel}><IdentityEditor language={language} kind="profile" name={name} setName={setName} emoji={emoji} setEmoji={setEmoji} kicker="INVITE" title={en?'Profile for this Circle':'끼리에서 사용할 내 프로필'} submitLabel={busy?(en?'Joining…':'참여 중…'):(en?'Join Circle':'참여하기')} busy={busy} error={error} onDone={submit} onCancel={onCancel}/></IdentityModal>
}

export function CirclePicker({circles,selected,onSelect,onJoin,onCreate,onClose,initialCode='',language='ko'}){
 const en=language==='en',[code,setCode]=useState(normalizeInviteCode(initialCode)),[confirming,setConfirming]=useState(Boolean(normalizeInviteCode(initialCode)))
 useEffect(()=>{const normalized=normalizeInviteCode(initialCode);if(normalized){setCode(normalized);setConfirming(true)}},[initialCode])
 const prepareJoin=()=>{const normalized=normalizeInviteCode(code);if(!normalized)return;setCode(normalized);setConfirming(true)}
 return <><Sheet className="circle-picker-sheet" language={language} title={en?'Switch circle':'끼리 전환'} onClose={onClose}><div className="pcard join-box"><h3>{en?'Join with an invite code':'초대 코드로 들어가기'}</h3><p>{en?'Paste an invite message, link, or code. Your Circle profile is required before joining.':'초대 메시지·링크·코드를 그대로 붙여 넣으세요. 참여 전에 이 끼리에서 사용할 프로필을 설정합니다.'}</p><div className="join-row"><input className="field" value={code} onChange={e=>setCode(e.target.value)} placeholder={en?'e.g. KKIU-ABCD-EFGH-JKMP-QRST':'예: KKIU-ABCD-EFGH-JKMP-QRST'}/><button className="mbtn primary" data-act="invite-join" disabled={!normalizeInviteCode(code)} onClick={prepareJoin}>{en?'Continue':'확인'}</button></div></div><div className="circle-picker-list">{circles.map(c=>{const badge=(c.unread||0)+(c.unreadDone||0),activeCount=c.tasks.filter(t=>!t.done).length;return <button className={`suprow circle-picker-row${selected===c.id?' selected':''}`} key={c.id} onClick={()=>onSelect(c.id)}><span className="crow-check">{c.emoji}</span><span className="smid"><OverflowText className="circle-picker-name" title={c.name}>{c.name}</OverflowText><span className="circle-picker-meta"><span>{en?'Members':'멤버'} <b>{c.members?.length||1}</b></span><i aria-hidden="true">·</i><span>{en?'Active':'진행 중'} <b>{activeCount}</b></span></span></span>{badge>0&&<span className="circle-badge">{badge}</span>}<span className="out">{selected===c.id?'✓':'›'}</span></button>})}</div><button className="featins" data-act="circle-new" onClick={onCreate}><span className="p">+</span>{en?'New circle':'새 끼리 만들기'}</button></Sheet>{confirming&&<JoinProfileModal code={normalizeInviteCode(code)} language={language} onCancel={()=>setConfirming(false)} onJoin={onJoin}/>}</>
}

function IdentityEditor({kind,name,setName,emoji,setEmoji,onDone,onCancel,language='ko',kicker,title,submitLabel,busy=false,error=''}) {
 const en=language==='en';
 const[recent,setRecent]=useState(readRecentEmojis)
 const limit=kind==='circle'?CIRCLE_NAME_LIMIT:PROFILE_NAME_LIMIT
 const pick=(symbol)=>{setEmoji(symbol);setRecent(pushRecentEmoji(symbol))}
 const groups=[...(recent.length?[{id:'recent',ko:'자주 사용',en:'Recent',items:recent.map(symbol=>[symbol,''])}]:[]),...EMOJI_CATEGORIES]
 return <div className="identity-editor"><header className="identity-editor-head"><div><span className="identity-editor-kicker">{kicker||(kind==='circle'?'CIRCLE':'MY PROFILE')}</span><h3>{title||(kind==='circle'?(en?'Circle settings':'끼리 설정'):(en?'My profile settings':'내 프로필 설정'))}</h3></div><button className="identity-close" data-act="modal-cancel" aria-label={en?'Close':'닫기'} onClick={onCancel}>×</button></header><div className="identity-editor-body"><label className="identity-field-label">{en?'Name':'이름'} <small>{graphemeLength(name)}/{limit}</small></label><div className="identity-name-wrap"><span className="identity-name-preview">{emoji}</span><input className="field" value={name} maxLength={limit*4} placeholder={kind==='circle'?(en?'Circle name':'끼리 이름'):(en?'Profile name':'프로필 이름')} onChange={e=>setName(limitGraphemes(e.target.value,limit))}/></div><div className="identity-field-label"><span>{en?'Emoji':'이모지'}</span></div><div className="identity-emoji-list">{groups.map(group=><section className="identity-emoji-group" key={group.id}><h4>{en?group.en:group.ko}</h4><div className="identity-emoji-grid">{group.items.map(([symbol])=><button type="button" aria-label={symbol} data-act="identity-emoji-pick" data-e={symbol} onClick={()=>pick(symbol)} key={`${group.id}-${symbol}`}>{symbol}</button>)}</div></section>)}</div>{error&&<p className="invite-error" role="alert">{error}</p>}</div><footer className="identity-actions"><button type="button" className="seltxt" data-act="identity-random" disabled={busy} onClick={()=>pick(flatEmojiCatalog[Math.floor(Math.random()*flatEmojiCatalog.length)][0])}>🎲 {en?'Random':'랜덤'}</button><button type="button" className="seltxt identity-save" data-act="identity-save" disabled={busy||!name.trim()} onClick={onDone}>{submitLabel||(en?'Save':'저장')}</button></footer></div>
}

function IdentityModal({children,onClose}){return <DialogSurface className="identity-modal" scrimLabel="닫기" onClose={onClose}>{children}</DialogSurface>}

function CreateIdentityStage({step,direction,children}){return <div key={step} className={`identity-create-stage ${direction}`}>{children}</div>}

export function CircleEditor({circle,profile,onSave,onInvite,onCopyCode,onRegenerate,onJoinLock,onActivity,onReorder,onLeave,onClose,language='ko'}) {
 const en=language==='en'
 const [name,setName]=useState(circle?.name||''),[emoji,setEmoji]=useState(circle?.emoji||'🌿'),[pn,setPn]=useState(profile?.name||''),[pe,setPe]=useState(profile?.emoji||'🙂'),[editing,setEditing]=useState(null),[createStep,setCreateStep]=useState('circle'),[createDirection,setCreateDirection]=useState('forward'),[memberReorder,setMemberReorder]=useState(null),[inviteBusy,setInviteBusy]=useState(false),[lockBusy,setLockBusy]=useState(false)
 const memberDrag=useRef(null)
 const save=()=>{const safeName=limitGraphemes(name.trim(),CIRCLE_NAME_LIMIT),safeProfile=limitGraphemes(pn.trim(),PROFILE_NAME_LIMIT);if(!safeName||!safeProfile)return;onSave({name:safeName,emoji,profileName:safeProfile,profileEmoji:pe})}
 const cancelEditing=()=>{if(editing==='circle'){setName(circle?.name||'');setEmoji(circle?.emoji||'🌿')}else{setPn(profile?.name||'영롱');setPe(profile?.emoji||'🌿')}setEditing(null)}
 const moveMember=(from,to)=>{if(!circle||from<1||to<1||to>=circle.members.length)return;const next=[...circle.members],[member]=next.splice(from,1);next.splice(to,0,member);onReorder?.(next)}
 const startMemberReorder=(member,index,event)=>{
  if(index<1||!circle)return
  const list=event.currentTarget.closest('.member-order-list')
  const rows=[...(list?.querySelectorAll('.member-order-row')||[])]
  const centers=rows.map(row=>{const rect=row.getBoundingClientRect();return rect.top+rect.height/2})
  const step=rows[1]&&rows[2]?Math.abs(centers[2]-centers[1]):(rows[index]?.getBoundingClientRect().height||58)+8
  memberDrag.current={id:member.id,pointerId:event.pointerId,from:index,to:index,startY:event.clientY,centers,step}
  event.currentTarget.setPointerCapture(event.pointerId)
  setMemberReorder({id:member.id,from:index,to:index,offset:0,step})
 }
 const moveMemberReorder=(event)=>{
  const drag=memberDrag.current
  if(!drag||drag.pointerId!==event.pointerId)return
  event.preventDefault()
  const offset=event.clientY-drag.startY
  let to=drag.from,best=Infinity
  for(let index=1;index<drag.centers.length;index+=1){const distance=Math.abs(drag.centers[drag.from]+offset-drag.centers[index]);if(distance<best){best=distance;to=index}}
  drag.to=to
  setMemberReorder({id:drag.id,from:drag.from,to,offset,step:drag.step})
 }
 const finishMemberReorder=(event,cancelled=false)=>{
  const drag=memberDrag.current
  if(!drag||drag.pointerId!==event.pointerId)return
  if(!cancelled&&drag.from!==drag.to)moveMember(drag.from,drag.to)
  memberDrag.current=null
  setMemberReorder(null)
  try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}
 }
 const regenerate=async()=>{if(inviteBusy)return;setInviteBusy(true);try{await onRegenerate?.()}finally{setInviteBusy(false)}}
 const toggleJoinLock=async()=>{if(lockBusy)return;setLockBusy(true);try{await onJoinLock?.(!circle.joinLocked)}finally{setLockBusy(false)}}
 if(!circle)return <IdentityModal onClose={onClose}><CreateIdentityStage step={createStep} direction={createDirection}>{createStep==='circle'?<IdentityEditor language={language} kind="circle" name={name} setName={setName} emoji={emoji} setEmoji={setEmoji} onDone={()=>{if(name.trim()){setCreateDirection('forward');setCreateStep('profile')}}} onCancel={onClose}/>:<IdentityEditor language={language} kind="profile" name={pn} setName={setPn} emoji={pe} setEmoji={setPe} onDone={save} onCancel={()=>{setCreateDirection('backward');setCreateStep('circle')}}/>}</CreateIdentityStage></IdentityModal>
 if(editing)return <IdentityModal onClose={cancelEditing}><IdentityEditor language={language} kind={editing} name={editing==='circle'?name:pn} setName={editing==='circle'?setName:setPn} emoji={editing==='circle'?emoji:pe} setEmoji={editing==='circle'?setEmoji:setPe} onDone={()=>{save();setEditing(null)}} onCancel={cancelEditing}/></IdentityModal>
 return <Sheet language={language} title={`${emoji} ${name}`} subtitle={en?'Manage circle':'끼리 관리'} onClose={onClose} hideClose>
  <div className="pcard invite-card"><h3>{en?'Invite code':'초대 코드'}</h3><button className="code-chip invite-code-inline" data-act="invite-code-copy" onClick={()=>onCopyCode?.(circle.code||'KKIU-HOME')}>{circle.code||'KKIU-HOME'} <small>{en?'Tap to copy':'눌러서 복사'}</small></button><p>{en?'Share one message containing the inviter, Circle, deep link, and code.':'초대한 사람·끼리 이름·설치 및 가입 후 복원되는 링크·코드를 한 메시지로 공유합니다.'}</p><div className="invite-actions"><button className="rbtn" data-act="invite" onClick={()=>onInvite?.({code:circle.code||'KKIU-HOME',circleName:name,inviterName:pn||profile?.name||'나'})}>{en?'Share invitation':'초대 메시지 공유'} <span>⎘</span></button><button className="rbtn" data-act="invite-regenerate" disabled={inviteBusy} onClick={regenerate}>{inviteBusy?(en?'Getting a new code…':'새 코드 받는 중…'):(en?'Get a new code':'코드 새로 받기')} <span>↻</span></button></div><p className="invite-warning">{en?'The previous code will stop working.':'새로 받으면 예전 코드는 사용할 수 없어요.'}</p></div>
   <button className="rbtn identity-setting" data-act="circle-identity-edit" onClick={()=>setEditing('circle')}><span className="mlead"><span className="mrank">{emoji}</span><span><b className="identity-label-text">{en?'Circle':'끼리'}</b><em className="identity-value">{name}</em></span></span><span className="identity-edit-affordance">{en?'Edit':'편집'} <i aria-hidden="true">›</i></span></button>
   <button className="rbtn identity-setting" data-act="profile-identity-edit" onClick={()=>setEditing('profile')}><span className="mlead"><span className="mrank">{pe}</span><span><b className="identity-label-text">{en?'My profile':'내 프로필'}</b><em className="identity-value">{pn}</em></span></span><span className="identity-edit-affordance">{en?'Edit':'편집'} <i aria-hidden="true">›</i></span></button>
   <button className="rbtn join-lock-setting" data-act="circle-join-lock" aria-pressed={!circle.joinLocked} disabled={lockBusy} onClick={toggleJoinLock}><span className="mlead"><span className="mrank">👥</span><span><b>{en?'Accept new members':'새 멤버 받기'}</b><em>{circle.joinLocked?(en?'Not accepting new members':'새 멤버를 받지 않아요'):(en?'Accepting new members':'새 멤버를 받고 있어요')}</em></span></span><span className={`setting-switch${circle.joinLocked?'':' on'}`} aria-hidden="true"><i/></span></button>
  {onActivity&&<button className="rbtn identity-setting activity-entry" data-act="circle-activity" onClick={onActivity}><span className="mlead"><span className="mrank">🕘</span><span><b className="activity-entry-label">{en?'Activity log':'활동 기록'}</b></span></span><span className="activity-entry-arrow" aria-hidden="true">›</span></button>}
  <div className="ghead"><span>{en?`${circle.members?.length||0} members`:`멤버 ${circle.members?.length||0}명`}</span></div>
  <div className={`member-order-list${memberReorder?' reordering':''}`}>{circle.members?.map((member,index)=>{
   const activeCount=circle.tasks.filter(task=>!task.done&&(task.assignee||task.assignees?.[0])===member.id).length
   let translate=0
   if(memberReorder){if(member.id===memberReorder.id)translate=memberReorder.offset;else if(memberReorder.from<memberReorder.to&&index>memberReorder.from&&index<=memberReorder.to)translate=-memberReorder.step;else if(memberReorder.from>memberReorder.to&&index>=memberReorder.to&&index<memberReorder.from)translate=memberReorder.step}
   return <div className={`suprow member-order-row${member.id===memberReorder?.id?' dragging':''}${member.leftAt?' former-member':''}`} data-member={member.id} key={member.id} style={{transform:`translate3d(0,${translate}px,0)${member.id===memberReorder?.id?' scale(1.025)':''}`}}><span className="who">{member.emoji}</span><span className="smid"><b>{member.name}{index===0?(en?' (me)':' (나)'):''}</b><span>{en?`${activeCount} active`:`진행 중 ${activeCount}개`}</span></span><span className="member-handle">{index===0?(en?'fixed':'고정'):member.leftAt?null:<button className="member-grip" aria-label={`${member.name} 순서 변경`} onPointerDown={event=>startMemberReorder(member,index,event)} onPointerMove={moveMemberReorder} onPointerUp={event=>finishMemberReorder(event)} onPointerCancel={event=>finishMemberReorder(event,true)} onKeyDown={event=>{if(event.key==='ArrowUp')moveMember(index,index-1);if(event.key==='ArrowDown')moveMember(index,index+1)}}>⠿</button>}</span></div>
  })}</div>
  <div className="mdiv"/><button className="rbtn" data-act="circle-leave" onClick={onLeave}>{en?'Leave circle':'나가기'} <span>›</span></button>
 </Sheet>
}

const activityDateKey=(value)=>{const date=new Date(value);return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}
const activityDateLabel=(value,language)=>new Intl.DateTimeFormat(language==='en'?'en-US':'ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(value))
const activityTimeLabel=(value,language)=>new Intl.DateTimeFormat(language==='en'?'en-US':'ko-KR',{hour:'2-digit',minute:'2-digit'}).format(new Date(value))
const activityPayloadValue=(payload,...keys)=>keys.map(key=>payload?.[key]).find(value=>value!==undefined&&value!==null&&value!=='')
const activityIdentity=(circle,id,fallbackName,fallbackEmoji,language)=>{
 const member=circle.members?.find(item=>item.id===id)
 return {name:member?.name||fallbackName||(language==='en'?'Someone':'누군가'),emoji:member?.emoji||fallbackEmoji||'🙂'}
}
const activityActor=(log,circle,language)=>activityIdentity(circle,log.actorId,activityPayloadValue(log.payload,'actor_name','actorName','member_name','memberName'),activityPayloadValue(log.payload,'actor_emoji','actorEmoji','member_emoji','memberEmoji'),language)
const activityHasBatchim=(value)=>{const text=String(value||'').trim(),code=text.charCodeAt(text.length-1);return code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28!==0}
const activityDirectionParticle=(value)=>{
 const text=String(value||'').trim(),code=text.charCodeAt(text.length-1)
 if(code<0xac00||code>0xd7a3)return '로'
 const batchim=(code-0xac00)%28
 return batchim&&batchim!==8?'으로':'로'
}
const activitySubject=(identity,language)=>language==='en'?`${identity.emoji} ${identity.name}`:`${identity.emoji} ${identity.name}${activityHasBatchim(identity.name)?'이':'가'}`
const activityMemberLabel=(identity)=>`${identity.emoji} ${identity.name}`
const activityTaskPosition=(payload,circle)=>{
 const raw=activityPayloadValue(payload,'position','new_position','old_position','task_position','taskPosition')
 if(Number.isFinite(Number(raw)))return Number(raw)+1
 const taskId=activityPayloadValue(payload,'task_id','taskId'),index=circle.tasks?.findIndex(task=>task.id===taskId)??-1
 return index>=0?index+1:'?'
}
const activitySentence=(log,circle,language)=>{
 const en=language==='en',payload=log.payload||{},actor=activitySubject(activityActor(log,circle,language),language)
 const title=activityPayloadValue(payload,'title','new_title','task_title','taskTitle')||(en?'a to-do':'할 일')
 const circleName=activityPayloadValue(payload,'name','new_name','newName','circle_name','circleName')||circle.name
 const assigneeId=activityPayloadValue(payload,'assignee_id','new_assignee_id','assigneeId','newAssigneeId')
 const assignee=activityIdentity(circle,assigneeId,activityPayloadValue(payload,'assignee_name','new_assignee_name','assigneeName','newAssigneeName'),activityPayloadValue(payload,'assignee_emoji','new_assignee_emoji','assigneeEmoji','newAssigneeEmoji'),language)
 const oldAssigneeId=activityPayloadValue(payload,'old_assignee_id','old_owner_id','oldAssigneeId','oldOwnerId')
 const oldAssignee=activityIdentity(circle,oldAssigneeId,activityPayloadValue(payload,'old_assignee_name','oldAssigneeName'),activityPayloadValue(payload,'old_assignee_emoji','oldAssigneeEmoji'),language)
 const position=activityTaskPosition(payload,circle),task=`#${position} '${title}'`
 const ownedTask=en?`${activityMemberLabel(assignee)}'s ${task}`:`${activityMemberLabel(assignee)}의 ${task}`
 const oldTitle=activityPayloadValue(payload,'old_title','oldTitle')||(en?'a to-do':'할 일')
 const newTitle=activityPayloadValue(payload,'new_title','newTitle')||title
 const oldPosition=Number(activityPayloadValue(payload,'old_position','oldPosition')),newPosition=Number(activityPayloadValue(payload,'new_position','newPosition'))
 if(en){
  const sentences={circle_renamed:`${actor} renamed the Circle to '${circleName}'`,circle_emoji_changed:`${actor} changed the Circle emoji`,invite_code_regenerated:`${actor} regenerated the invite code`,join_lock_on:`${actor} stopped accepting new members`,join_lock_off:`${actor} started accepting new members`,member_joined:`${actor} joined`,member_left:`${actor} left`,member_profile_updated:`${actor} updated their Circle profile`,task_created:`${actor} added ${ownedTask}`,task_deleted:`${actor} deleted ${ownedTask}`,task_completed:`${actor} completed ${ownedTask}`,task_reopened:`${actor} marked ${ownedTask} active again`,task_assignee_changed:`${actor} changed ${task}'s assignee from ${activityMemberLabel(oldAssignee)} to ${activityMemberLabel(assignee)}`,task_reassigned:`${actor} changed ${task}'s assignee from ${activityMemberLabel(oldAssignee)} to ${activityMemberLabel(assignee)}`,task_title_changed:`${actor} changed #${position} from '${oldTitle}' to '${newTitle}'`,task_position_changed:`${actor} moved ${activityMemberLabel(assignee)}'s '${title}' from #${Number.isFinite(oldPosition)?oldPosition+1:'?'} to #${Number.isFinite(newPosition)?newPosition+1:'?'}`,task_edited:`${actor} edited #${position} from '${oldTitle}' to '${newTitle}'`}
  return sentences[log.action]||activityPayloadValue(payload,'message')||`${actor} made a change`
 }
 const newPositionLabel=Number.isFinite(newPosition)?newPosition+1:'?'
 const oldPositionLabel=Number.isFinite(oldPosition)?oldPosition+1:'?'
 const oldOwnedTask=`${activityMemberLabel(oldAssignee)}의 ${task}`
 const editedTask=`${activityMemberLabel(assignee)}의 #${position} '${oldTitle}'`
 const movedTask=`${activityMemberLabel(assignee)}의 #${oldPositionLabel} '${title}'`
 const sentences={circle_renamed:`${actor} 끼리 이름을 '${activityPayloadValue(payload,'old_name','oldName')||circle.name}'에서 '${circleName}'${activityDirectionParticle(circleName)} 바꿨어요`,circle_emoji_changed:`${actor} 끼리 이모지를 바꿨어요`,invite_code_regenerated:`${actor} 초대 코드를 새로 받았어요`,join_lock_on:`${actor} 새 멤버 받기를 껐어요`,join_lock_off:`${actor} 새 멤버 받기를 켰어요`,member_joined:`${actor} '${circleName}'에 들어왔어요`,member_left:`${actor} '${circleName}'에서 나갔어요`,member_profile_updated:`${actor} 끼리 프로필을 수정했어요`,task_created:`${actor} ${ownedTask} 할 일을 추가했어요`,task_deleted:`${actor} ${ownedTask} 할 일을 삭제했어요`,task_completed:`${actor} ${ownedTask} 할 일을 완료했어요`,task_reopened:`${actor} ${ownedTask} 할 일을 다시 진행 중으로 바꿨어요`,task_assignee_changed:`${actor} ${oldOwnedTask} 할 일의 담당자를 ${activityMemberLabel(assignee)}${activityDirectionParticle(assignee.name)} 바꿨어요`,task_reassigned:`${actor} ${oldOwnedTask} 할 일의 담당자를 ${activityMemberLabel(assignee)}${activityDirectionParticle(assignee.name)} 바꿨어요`,task_title_changed:`${actor} ${editedTask} 할 일의 내용을 '${newTitle}'${activityDirectionParticle(newTitle)} 수정했어요`,task_position_changed:`${actor} ${movedTask} 할 일의 순서를 #${newPositionLabel}${activityDirectionParticle(newPositionLabel)} 바꿨어요`,task_edited:`${actor} ${editedTask} 할 일의 내용을 '${newTitle}'${activityDirectionParticle(newTitle)} 수정했어요`}
 return sentences[log.action]||activityPayloadValue(payload,'message')||`${actor} 변경했어요`
}
const taskActivityActions=new Set(['task_created','task_deleted','task_completed','task_reopened','task_assignee_changed','task_reassigned','task_title_changed','task_position_changed','task_edited'])
const activitySentenceContent=(log,circle,language)=>{
 const sentence=activitySentence(log,circle,language)
 if(!taskActivityActions.has(log.action))return sentence
 return sentence.split(/('[^']*')/g).map((part,index)=>part.startsWith("'")&&part.endsWith("'")?<strong className="activity-task-title" key={`${log.id}-title-${index}`}>{part}</strong>:part)
}

export function ActivityLogSheet({circle,loadPage,onClose,language='ko'}){
 const en=language==='en'
 const[logs,setLogs]=useState([]),[loading,setLoading]=useState(true),[hasMore,setHasMore]=useState(true),[error,setError]=useState('')
 const loadingRef=useRef(null),offsetRef=useRef(0),generationRef=useRef(0),sentinelRef=useRef(null)
 const fetchPage=async(offset,generation=generationRef.current)=>{
  if(loadingRef.current===generation)return
  loadingRef.current=generation
  setLoading(true)
  setError('')
  try{
   const page=await loadPage(offset,30)
   if(generation!==generationRef.current)return
   setLogs(current=>offset===0?page:[...current,...page.filter(item=>!current.some(existing=>existing.id===item.id))])
   offsetRef.current=offset+page.length
   setHasMore(page.length===30)
  }catch(fetchError){
   if(generation===generationRef.current){setError(en?'Could not load activity.':'활동 기록을 불러오지 못했어요.');setHasMore(false)}
  }finally{
   if(generation===generationRef.current)setLoading(false)
   if(loadingRef.current===generation)loadingRef.current=null
  }
 }
 useEffect(()=>{
  const generation=generationRef.current+1
  generationRef.current=generation
  offsetRef.current=0
  setLogs([])
  setHasMore(true)
  void fetchPage(0,generation)
  return()=>{generationRef.current+=1;if(loadingRef.current===generation)loadingRef.current=null}
 },[circle.id])
 useEffect(()=>{
  const sentinel=sentinelRef.current
  if(!sentinel||!hasMore||loading)return undefined
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))void fetchPage(offsetRef.current)},{root:sentinel.closest('.sheetbody'),rootMargin:'180px 0px'})
  observer.observe(sentinel)
  return()=>observer.disconnect()
 },[hasMore,loading,logs.length])
 const groups=useMemo(()=>{
  const grouped=[]
  logs.forEach(log=>{const key=activityDateKey(log.createdAt);let group=grouped[grouped.length-1];if(!group||group.key!==key){group={key,label:activityDateLabel(log.createdAt,language),items:[]};grouped.push(group)}group.items.push(log)})
  return grouped
 },[logs,language])
 return <Sheet className="activity-log-sheet" language={language} title={en?'Activity log':'활동 기록'} onClose={onClose}>
  <div className="activity-log-list">{groups.map(group=><section className="activity-day" key={group.key}><h3>{group.label}</h3>{group.items.map(log=><article className="activity-item" key={log.id}><span className="activity-dot" aria-hidden="true"/><div><p>{activitySentenceContent(log,circle,language)}</p><time dateTime={log.createdAt}>{activityTimeLabel(log.createdAt,language)}</time></div></article>)}</section>)}</div>
  {!logs.length&&!loading&&!error&&<div className="empty activity-empty"><b>{en?'No activity yet':'아직 활동 기록이 없어요'}</b></div>}
  {error&&<p className="activity-error" role="alert">{error}</p>}
  {loading&&<p className="activity-loading">{en?'Loading…':'불러오는 중…'}</p>}
  <div className="activity-sentinel" ref={sentinelRef} aria-hidden="true"/>
  <p className="activity-retention">{en?'Activity logs are kept for 90 days.':'활동 기록은 90일까지 보관돼요'}</p>
 </Sheet>
}

const startOfDay=(value)=>{const date=new Date(value);date.setHours(0,0,0,0);return date.getTime()}
const completedGroup=(iso,language)=>{const day=startOfDay(iso),now=startOfDay(Date.now()),diff=Math.round((now-day)/864e5);if(diff===0)return language==='en'?'Today':'오늘';if(diff===1)return language==='en'?'Yesterday':'어제';if(diff<7)return language==='en'?'This week':'이번 주';return language==='en'?'Earlier':'이전'}
const COMPLETED_WINDOW_MS=7*24*60*60*1000
export function CompletedSheet({tasks,members,circle,onRestore,onDelete,onClose,language='ko',focusTaskId,footer}){
 const[expanded,setExpanded]=useState(null),[filter,setFilter]=useState(''),[flashId,setFlashId]=useState(null),bodyRef=useRef(null)
 const chipResistance=useHorizontalResistance()
 const recentTasks=useMemo(()=>{const now=Date.now(),cutoff=now-COMPLETED_WINDOW_MS;return tasks.filter(task=>{const completedAt=new Date(task.completedAt).getTime();return Number.isFinite(completedAt)&&completedAt>=cutoff&&completedAt<=now})},[tasks])
 const filtered=filter?recentTasks.filter(t=>(t.assignees||[t.assignee]).includes(filter)):recentTasks
 const labels=language==='en'?['Today','Yesterday','This week','Earlier']:['오늘','어제','이번 주','이전']
 const groups=useMemo(()=>labels.map(label=>({label,items:filtered.filter(task=>completedGroup(task.completedAt,language)===label)})).filter(group=>group.items.length),[filtered,language])
 useEffect(()=>{if(!focusTaskId)return undefined;setFilter('');setFlashId(null);let timer=0,frame2=0;const frame=requestAnimationFrame(()=>{frame2=requestAnimationFrame(()=>{const row=bodyRef.current?.querySelector(`[data-task-id="${focusTaskId}"]`);row?.scrollIntoView({block:'center',behavior:'smooth'});setFlashId(focusTaskId);timer=window.setTimeout(()=>setFlashId(null),1900)})});return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(frame2);window.clearTimeout(timer)}},[focusTaskId])
 return <Sheet className="completed-sheet" bodyRef={bodyRef} title={language==='en'?'✓ Completed in the last 7 days':'✓ 최근 7일 완료 목록'} onClose={onClose} language={language} footer={footer}>{circle&&<div className="donechips horizontal-resistance" {...chipResistance}><div className="horizontal-resistance-track"><button className={`donechip${!filter?' on':''}`} data-act="done-filter" onClick={()=>setFilter('')}>{language==='en'?'All':'전체'}</button>{members.map(m=><button className={`donechip${filter===m.id?' on':''}${m.leftAt?' former-member':''}`} data-act="done-filter" data-m={m.id} key={m.id} onClick={()=>setFilter(m.id)}><span className="av">{m.emoji}</span>{m.name}</button>)}</div></div>}{!filtered.length?<div className="empty completed-empty"><div className="empty-c"><h3>{recentTasks.length?(language==='en'?'No completed tasks for this member':'이 담당자의 완료 항목이 없어요'):(language==='en'?'No tasks completed in the last 7 days':'최근 7일 완료한 일이 없어요')}</h3><p>{language==='en'?'Tap a completed circle to restore its original position.':'동그라미를 다시 누르면 완료 당시 번호로 복원돼요.'}</p></div></div>:groups.map(g=><section key={g.label}><div className="ghead"><span>{g.label} · {g.items.length}</span></div>{g.items.map(t=>{const assignee=members.find(m=>(t.assignees||[t.assignee]).includes(m.id));return <div className={`drow${expanded===t.id?' expanded':''}${flashId===t.id?' target-hit':''}`} key={t.id} data-task-id={t.id} data-act="sheet-expand" data-id={t.id} onClick={()=>setExpanded(expanded===t.id?null:t.id)}><button className="ck on" aria-label={`${language==='en'?'Restore':'완료 취소'}: ${t.title}`} data-act="restore" data-id={t.id} onClick={e=>{e.stopPropagation();onRestore(t.id)}}><span className="done-check-icon" aria-hidden="true"/></button><span className="rankc">#{(t.doneAt??0)+1}</span><span className="dtitle">{t.title}</span>{t.sourceUnread&&<i className="source-unread-dot" aria-label={language==='en'?'Unseen update':'처음 확인하는 업데이트'}/>} {circle&&<span className={`who${assignee?.leftAt?' former':''}`}>{assignee?.emoji}</span>}<span className="dtime">{t.completedAt?new Date(t.completedAt).toLocaleDateString(language==='en'?'en-US':'ko-KR'):''}</span><button className="dx" aria-label={`${language==='en'?'Delete':'삭제'}: ${t.title}`} data-act="sheet-del" data-id={t.id} onClick={e=>{e.stopPropagation();onDelete(t.id)}}>×</button></div>})}</section>)}</Sheet>
}

export function ConfirmDialog({title,message,confirmLabel,danger,onCancel,onConfirm,language='ko'}){const titleId=useId(),messageId=useId();return <DialogSurface role="alertdialog" labelledBy={titleId} describedBy={messageId} scrimLabel={language==='en'?'Cancel':'취소'} onClose={onCancel}><h3 id={titleId}>{title}</h3><p id={messageId} className="confirm-message">{message}</p><div className="mrow"><button className="mbtn" data-act="modal-cancel" onClick={onCancel}>{language==='en'?'Cancel':'취소'}</button><button className={`mbtn ${danger?'danger':'primary'}`} data-act="modal-ok" onClick={onConfirm}>{confirmLabel||(language==='en'?'Confirm':'확인')}</button></div></DialogSurface>}
