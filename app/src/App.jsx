import { useEffect, useMemo, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Header from './components/Header.jsx'
import MoreScreen from './components/MoreScreen.jsx'
import QueueScreen from './components/QueueScreen.jsx'
import { members, starterData } from './data.js'

const STORAGE_KEY = 'kkiu-react-0.1'
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || starterData } catch { return starterData }
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [data, setData] = useState(loadData)
  const [circleId, setCircleId] = useState(data.circles[0]?.id)
  const [query, setQuery] = useState(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])
  useEffect(() => {
    const handler = (event) => setQuery(event.detail)
    document.addEventListener('querychange', handler)
    return () => document.removeEventListener('querychange', handler)
  }, [])

  const circle = data.circles.find((item) => item.id === circleId) || data.circles[0]
  const tasks = tab === 'circle' ? circle?.tasks || [] : data.personal
  const unread = useMemo(() => data.circles.reduce((sum, item) => sum + (item.unread || 0), 0), [data.circles])

  const updateTasks = (updater) => setData((current) => {
    if (tab === 'home') return { ...current, personal: updater(current.personal) }
    return { ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, tasks: updater(item.tasks), unread: 0 } : item) }
  })

  const addTask = (title, assignee = 'me') => updateTasks((current) => [...current, { id: makeId(), title, assignee, done: false, createdAt: Date.now() }])
  const completeTask = (id) => updateTasks((current) => current.map((task) => task.id === id ? { ...task, done: true, completedAt: new Date().toISOString() } : task))
  const editTask = (id, title) => updateTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task))
  const setAssignee = (id, assignee) => updateTasks((current) => current.map((task) => task.id === id ? { ...task, assignee } : task))

  const switchTab = (next) => { setTab(next); setQuery(null) }
  const cycleCircle = () => {
    if (!data.circles.length) return
    const index = data.circles.findIndex((item) => item.id === circle?.id)
    setCircleId(data.circles[(index + 1) % data.circles.length].id)
    setQuery(null)
  }

  return <div className="app-shell">
    <section className="phone">
      <Header tab={tab} circle={circle} searchOpen={query !== null} onSearch={() => setQuery((current) => current === null ? '' : null)} onCircleSelect={cycleCircle} />
      {tab === 'more' ? <MoreScreen /> : <QueueScreen tasks={tasks} members={members} circle={tab === 'circle' ? circle : null} query={query} onAdd={addTask} onComplete={completeTask} onEdit={editTask} onAssignee={setAssignee} />}
      <BottomNav tab={tab} unread={unread} onChange={switchTab} />
    </section>
  </div>
}
