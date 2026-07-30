export const members=[
{id:'me',name:'영롱',emoji:'🌿'},{id:'su',name:'수호',emoji:'🐶'},{id:'da',name:'다온',emoji:'🍊'},{id:'jh',name:'지호',emoji:'🪁'},{id:'ha',name:'하은',emoji:'🌸'},{id:'jw',name:'준서',emoji:'🌊'},{id:'sy',name:'서연',emoji:'☀️'},{id:'mj',name:'민준',emoji:'🌳'},{id:'yu',name:'유나',emoji:'🧡'},{id:'dy',name:'도윤',emoji:'🚲'}]
const titles=['프로젝트 킥오프 안건 정리','디자인 시스템 컬러 토큰 검토','이번 주 회고 메모 작성','장보기 — 우유, 달걀, 커피, 휴지, 세제, 고양이 모래까지 잊지 말고 한 번에 사오기','30분 운동하기','부모님께 안부 전화','여행 숙소 후보 비교하고 가격·위치·후기까지 표로 정리해서 공유하기','읽을 아티클 모아두기','세금 서류 제출','자전거 라이트 교체','도서관 책 반납','블로그 초안 퇴고','화분 물주기','주간 회의 안건 공유']
const homeTitles=['주말 장보기 리스트 확정','세탁소에 코트 맡기기','공과금 이체','거실 전구 교체','분리수거 버리기','에어컨 필터 청소','약국에서 영양제 사오기','주말 데이트 식당 예약','화장실 수건 교체','베란다 화분 분갈이','차량 정기점검 예약','부모님 생신 선물 고르기']
const tripTitles=['숙소 최종 결제','KTX 왕복 예매','렌터카 비교해서 예약','짐 체크리스트 만들기','첫날 저녁 횟집 예약']
const now=Date.now()
const activityAt=(minutesAgo)=>new Date(now-minutesAgo*60*1000).toISOString()
const activityLogs=[
{id:'activity-1',action:'task_created',actorId:'da',createdAt:activityAt(8),payload:{task_id:'c1t2',title:'공과금 자동이체 확인',position:2,assignee_id:'da'}},
{id:'activity-2',action:'task_completed',actorId:'da',createdAt:activityAt(24),payload:{task_id:'c1t2',title:'공과금 자동이체 확인',position:2,assignee_id:'da'}},
{id:'activity-3',action:'task_reopened',actorId:'da',createdAt:activityAt(39),payload:{task_id:'c1t2',title:'공과금 자동이체 확인',position:2,assignee_id:'da'}},
{id:'activity-4',action:'task_title_changed',actorId:'da',createdAt:activityAt(58),payload:{task_id:'c1t2',old_title:'공과금 자동이체 확인',new_title:'공과금 이체',position:2,assignee_id:'da'}},
{id:'activity-5',action:'task_assignee_changed',actorId:'jh',createdAt:activityAt(76),payload:{task_id:'c1t3',title:'거실 전구 교체',position:3,old_assignee_id:'jh',new_assignee_id:'ha'}},
{id:'activity-6',action:'task_position_changed',actorId:'ha',createdAt:activityAt(95),payload:{task_id:'c1t4',title:'분리수거 버리기',old_position:4,new_position:1,assignee_id:'ha'}},
{id:'activity-7',action:'task_deleted',actorId:'da',createdAt:activityAt(128),payload:{task_id:'c1t2',title:'공과금 자동이체 확인',position:2,assignee_id:'da'}},
{id:'activity-8',action:'member_joined',actorId:'yu',createdAt:activityAt(170),payload:{member_id:'yu',nickname:'유나',emoji:'🧡'}},
{id:'activity-9',action:'member_profile_updated',actorId:'yu',createdAt:activityAt(220),payload:{member_id:'yu',old_nickname:'별이',new_nickname:'유나',old_emoji:'⭐',new_emoji:'🧡'}},
{id:'activity-10',action:'member_left',actorId:'ha',createdAt:activityAt(260),payload:{member_id:'ha',nickname:'하은',emoji:'🌸'}},
{id:'activity-11',action:'circle_renamed',actorId:'me',createdAt:activityAt(310),payload:{old_name:'가족',new_name:'우리집'}},
{id:'activity-12',action:'circle_emoji_changed',actorId:'me',createdAt:activityAt(380),payload:{old_emoji:'🌿',new_emoji:'🏠'}},
{id:'activity-13',action:'invite_code_regenerated',actorId:'me',createdAt:activityAt(26*60),payload:{}},
{id:'activity-14',action:'join_lock_on',actorId:'me',createdAt:activityAt(27*60),payload:{locked:true}},
{id:'activity-15',action:'join_lock_off',actorId:'me',createdAt:activityAt(28*60),payload:{locked:false}},
]
const homeAssignees=[['me'],['su'],['da'],['jh'],['ha'],['jw'],['sy'],['mj','yu'],['yu'],['dy'],['su'],['me']]
const homeTasks=homeTitles.map((title,i)=>({id:`c1t${i}`,title,assignees:homeAssignees[i],assignee:homeAssignees[i][0],done:i===homeTitles.length-1,doneAt:i,completedAt:i===homeTitles.length-1?new Date(now-7200000).toISOString():null,sourceUnread:i===1||i===4||i===homeTitles.length-1}))
export const starterData={
personal:titles.map((title,i)=>({id:`p${i}`,title,done:false,createdAt:now-i*1000})),
circles:[
{id:'c1',name:'우리집',emoji:'🏠',code:'KKIU-VOMZ',joinLocked:false,unread:0,unreadDone:1,members,memberUnread:{me:2,su:1},tasks:homeTasks,activityLogs},
{id:'c2',name:'강릉 여행',emoji:'✈️',code:'KKIU-TRIP',joinLocked:false,unread:3,unreadDone:0,members:members.slice(0,3),memberUnread:{},tasks:tripTitles.map((title,i)=>({id:`c2t${i}`,title,assignee:['me','da','su','da','me'][i],done:false})),activityLogs:activityLogs.slice(0,5).map((log,index)=>({...log,id:`trip-${index}`,payload:{...log.payload,actor_name:['영롱','다온','수호','다온','영롱'][index]}}))}
],settings:{compact:false,motion:true,notifications:true,serviceNotifications:true,interactionFeedback:true,theme:'system',language:'ko'}}
