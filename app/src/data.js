export const members = [
  { id: 'me', name: '나', emoji: '🙂', role: 'owner' },
  { id: 'mina', name: '미나', emoji: '🐰', role: 'member' },
  { id: 'jun', name: '준', emoji: '🐻', role: 'member' },
  { id: 'sol', name: '솔', emoji: '🐥', role: 'member' },
]

export const starterData = {
  personal: [
    { id: 'p1', title: '장보기 목록 확인하기', favorite: true, done: false, createdAt: Date.now() - 3000 },
    { id: 'p2', title: '동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세', done: false, createdAt: Date.now() - 2000 },
    { id: 'p3', title: '우산 챙기기', done: false, createdAt: Date.now() - 1000 },
    { id: 'p4', title: '지난주 영수증 정리', done: true, doneAt: 2, completedAt: new Date().toISOString() },
  ],
  circles: [
    { id: 'c1', name: '주말을 알차게 보내는 사람들', emoji: '🏕️', code: 'KKIU-WEEK', unread: 2, unreadDone: 1, members, memberUnread: { mina: 1, jun: 1 }, tasks: [
      { id: 'c1t1', title: '숙소 체크인 시간 확인', assignee: 'me', done: false },
      { id: 'c1t2', title: '저녁 식당 예약', assignee: 'mina', done: false },
      { id: 'c1t3', title: '보드게임 챙기기', assignee: 'jun', done: false },
      { id: 'c1t4', title: '장보기 분담하기', assignee: 'sol', done: true, doneAt: 3, completedAt: new Date().toISOString() },
    ]},
    { id: 'c2', name: '우리 가족', emoji: '🏠', code: 'KKIU-HOME', unread: 1, members: members.slice(0, 3), memberUnread: { mina: 1 }, tasks: [] },
  ],
  settings: { compact: false, motion: true, notifications: true },
}
