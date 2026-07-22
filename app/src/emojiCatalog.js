// Categorized emoji catalog for the identity/profile emoji pickers.
// Categories follow the product spec: 사람·가족 ~ 돈·행정 are first-class tabs,
// and 날씨/시간/장소/기념일/육아/차량/디지털/반복·습관/중요도/비밀·개인 are merged into 기타.
// Each item is [emoji, 'korean english keywords'] for search.

export const RECENT_EMOJI_KEY = 'kkiu-recent-emoji-v1'
export const RECENT_EMOJI_LIMIT = 18

export const EMOJI_CATEGORIES = [
  { id: 'people', ko: '사람·가족', en: 'People', items: [
    ['🙂', '사람 얼굴 person face'], ['😀', '웃음 happy smile'], ['😊', '미소 smile'], ['👶', '아기 baby'],
    ['👧', '딸 여자아이 girl daughter'], ['👦', '아들 남자아이 boy son'], ['👩', '엄마 여자 woman mom'], ['👨', '아빠 남자 man dad'],
    ['👵', '할머니 grandma'], ['👴', '할아버지 grandpa'], ['👨‍👩‍👧‍👦', '가족 family'], ['🧑‍🤝‍🧑', '친구 둘 friends'],
    ['💑', '커플 연인 couple love'], ['🤱', '육아 수유 엄마 아기 baby care'],
  ] },
  { id: 'animal', ko: '동물', en: 'Animals', items: [
    ['🐶', '강아지 개 dog puppy'], ['🐕', '개 강아지 dog'], ['🐱', '고양이 cat kitten'], ['🐈', '고양이 cat'],
    ['🐰', '토끼 rabbit bunny'], ['🦊', '여우 fox'], ['🐻', '곰 bear'], ['🐼', '판다 panda'],
    ['🐹', '햄스터 hamster'], ['🐥', '병아리 새 chick bird'], ['🐟', '물고기 fish'], ['🐢', '거북이 turtle'],
    ['🐸', '개구리 frog'], ['🦋', '나비 butterfly'],
  ] },
  { id: 'nature', ko: '식물·자연', en: 'Nature', items: [
    ['🌿', '잎 풀 자연 leaf plant nature'], ['🌱', '새싹 sprout seedling'], ['🪴', '화분 식물 plant pot'], ['🌳', '나무 tree'],
    ['🌸', '꽃 벚꽃 flower blossom'], ['🌹', '장미 꽃 rose flower'], ['🌻', '해바라기 꽃 sunflower'], ['🌷', '튤립 꽃 tulip flower'],
    ['🍀', '클로버 행운 clover luck'], ['🌾', '벼 곡식 rice grain'], ['🌊', '바다 파도 sea wave'], ['⛰️', '산 mountain'],
  ] },
  { id: 'home', ko: '집·생활', en: 'Home', items: [
    ['🏠', '집 우리집 home house'], ['🛏️', '침대 잠 bed sleep'], ['🧹', '청소 빗자루 clean broom'], ['🧺', '빨래 바구니 laundry basket'],
    ['🧼', '비누 세면 soap wash'], ['🪣', '양동이 걸레 bucket mop'], ['🚿', '샤워 shower'], ['🛁', '욕조 목욕 bath'],
    ['🪞', '거울 mirror'], ['🧻', '휴지 tissue'], ['🗑️', '쓰레기 분리수거 trash'], ['🔑', '열쇠 key'],
  ] },
  { id: 'food', ko: '음식·장보기', en: 'Food', items: [
    ['🍚', '밥 식사 rice meal'], ['🍳', '요리 계란 cooking egg'], ['🍎', '사과 과일 apple fruit'], ['🍊', '오렌지 귤 과일 orange fruit'],
    ['🥕', '당근 채소 carrot vegetable'], ['🥛', '우유 milk'], ['🛒', '장보기 마트 cart shopping'], ['🧾', '영수증 receipt'],
    ['🍞', '빵 bread'], ['🥚', '계란 달걀 egg'], ['☕', '커피 음료 coffee drink'], ['🍱', '도시락 lunch box'],
  ] },
  { id: 'work', ko: '일·공부', en: 'Work & Study', items: [
    ['💼', '일 회사 가방 work briefcase'], ['📚', '책 공부 books study'], ['✏️', '연필 쓰기 pencil write'], ['📝', '메모 노트 memo note'],
    ['💻', '노트북 컴퓨터 laptop computer'], ['🖥️', '컴퓨터 모니터 desktop monitor'], ['📅', '달력 일정 calendar schedule'], ['📊', '차트 보고서 chart report'],
    ['📎', '클립 서류 clip document'], ['🗂️', '파일 정리 folder file'], ['🎓', '졸업 학위 공부 graduate study'], ['🖨️', '프린터 인쇄 printer print'],
  ] },
  { id: 'health', ko: '건강·운동', en: 'Health', items: [
    ['💪', '운동 근육 헬스 muscle workout'], ['🏃', '달리기 러닝 run jogging'], ['🧘', '요가 명상 yoga meditation'], ['⚽', '축구 공 soccer ball'],
    ['🏀', '농구 basketball'], ['🏊', '수영 swim'], ['🚴', '자전거 운동 cycling bike'], ['💊', '약 영양제 medicine pill'],
    ['🩺', '병원 진료 hospital doctor'], ['😴', '잠 수면 sleep'], ['🥗', '샐러드 다이어트 salad diet'], ['🦷', '치아 치과 tooth dentist'],
  ] },
  { id: 'travel', ko: '이동·여행', en: 'Travel', items: [
    ['🚗', '자동차 차 car'], ['🚌', '버스 bus'], ['🚇', '지하철 subway metro'], ['✈️', '비행기 여행 plane travel'],
    ['🏕️', '캠핑 camp camping'], ['🧳', '여행 짐 캐리어 luggage trip'], ['🗺️', '지도 여행 map travel'], ['⛱️', '해변 휴가 beach vacation'],
    ['🚲', '자전거 bicycle bike'], ['🛵', '스쿠터 오토바이 scooter'], ['🚆', '기차 train'], ['🛥️', '배 보트 boat'],
  ] },
  { id: 'hobby', ko: '취미·여가', en: 'Hobbies', items: [
    ['🎮', '게임 game'], ['🎵', '음악 노래 music song'], ['🎬', '영화 movie film'], ['🎨', '그림 미술 art paint'],
    ['📷', '사진 카메라 photo camera'], ['🎸', '기타 악기 guitar instrument'], ['🧶', '뜨개질 털실 knitting yarn'], ['🪁', '연 kite'],
    ['🎣', '낚시 fishing'], ['♟️', '체스 보드게임 chess board game'], ['📖', '독서 읽기 reading book'], ['🎤', '노래 마이크 sing mic karaoke'],
  ] },
  { id: 'goal', ko: '감정·목표', en: 'Feelings & Goals', items: [
    ['🎯', '목표 과녁 target goal'], ['⭐', '별 star'], ['🔥', '불 열정 fire passion'], ['✨', '반짝임 sparkle'],
    ['💡', '아이디어 전구 idea light'], ['✅', '완료 체크 done check'], ['🏆', '트로피 우승 trophy win'], ['🌙', '달 밤 moon night'],
    ['💛', '노랑 하트 마음 yellow heart'], ['😌', '평온 안심 relieved calm'], ['🙏', '감사 기도 thanks pray'], ['💯', '백점 최고 100 perfect'],
  ] },
  { id: 'money', ko: '돈·행정', en: 'Money & Admin', items: [
    ['💰', '돈 저축 money savings'], ['💳', '카드 결제 card payment'], ['🏦', '은행 bank'], ['📄', '서류 문서 document paper'],
    ['🖊️', '펜 서명 pen sign'], ['📑', '서류 계약 contract document'], ['💸', '지출 송금 spend transfer'], ['🪙', '동전 coin'],
    ['📮', '우체통 우편 mailbox post'], ['🏛️', '관공서 행정 government office'], ['📬', '우편 편지 mail letter'], ['🧮', '계산 정산 calculate abacus'],
  ] },
  { id: 'symbol', ko: '숫자·문자', en: 'Numbers & Letters', items: [
    ['0️⃣', '숫자 영 zero 0'], ['1️⃣', '숫자 일 one 1'], ['2️⃣', '숫자 이 two 2'], ['3️⃣', '숫자 삼 three 3'],
    ['4️⃣', '숫자 사 four 4'], ['5️⃣', '숫자 오 five 5'], ['6️⃣', '숫자 육 six 6'], ['7️⃣', '숫자 칠 seven 7'],
    ['8️⃣', '숫자 팔 eight 8'], ['9️⃣', '숫자 구 nine 9'], ['🔟', '숫자 십 ten 10'], ['🅰️', '알파벳 에이 letter a'],
    ['🅱️', '알파벳 비 letter b'], ['🆗', '오케이 ok'], ['🆕', '새로움 new'], ['🆙', '업 레벨업 up'],
    ['🆒', '멋짐 cool'], ['🆓', '무료 free'],
  ] },
  { id: 'etc', ko: '기타', en: 'Etc', items: [
    ['☀️', '해 맑음 날씨 sun sunny weather'], ['🌧️', '비 날씨 rain weather'], ['⛅', '구름 흐림 날씨 cloud weather'], ['❄️', '눈 겨울 날씨 snow winter'],
    ['🌈', '무지개 rainbow'], ['⚡', '번개 전기 lightning electric'], ['⏰', '알람 시간 alarm time'], ['⌛', '모래시계 시간 hourglass time'],
    ['📍', '장소 위치 핀 place location pin'], ['🎂', '생일 케이크 기념일 birthday cake anniversary'], ['🎁', '선물 기념일 gift present'], ['🎉', '축하 파티 기념일 party celebrate'],
    ['🍼', '젖병 육아 아기 bottle baby care'], ['🧸', '곰인형 육아 장난감 teddy toy kids'], ['🚙', '차량 차 SUV car vehicle'], ['⛽', '주유 기름 차량 gas fuel'],
    ['🔧', '정비 수리 차량 repair tool'], ['📱', '휴대폰 디지털 phone digital'], ['🔋', '배터리 충전 디지털 battery charge'], ['🔁', '반복 습관 repeat habit'],
    ['📆', '반복 일정 습관 달력 routine calendar habit'], ['❗', '중요 느낌표 important urgent'], ['🚩', '깃발 중요 표시 flag important'], ['🔒', '잠금 비밀 개인 lock secret private'],
    ['🗝️', '열쇠 비밀 old key secret'], ['🤫', '쉿 비밀 개인 quiet secret private'],
  ] },
]

export const flatEmojiCatalog = EMOJI_CATEGORIES.flatMap((category) => category.items)

export function readRecentEmojis() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY))
    return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string').slice(0, RECENT_EMOJI_LIMIT) : []
  } catch {
    return []
  }
}

export function pushRecentEmoji(symbol) {
  const next = [symbol, ...readRecentEmojis().filter((item) => item !== symbol)].slice(0, RECENT_EMOJI_LIMIT)
  try { localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  return next
}
