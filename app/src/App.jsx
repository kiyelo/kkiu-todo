import { useEffect, useMemo, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Header from './components/Header.jsx'
import MoreScreen from './components/MoreScreen.jsx'
import QueueScreen from './components/QueueScreen.jsx'
import { CirclePicker, CompletedSheet } from './components/Sheets.jsx'
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
  const [filter, setFilter] = useState(null)
  const [circlePickerOpen, setCirclePickerOpen] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])

  const circle = data.circles.find((item) => item.id === circleId) || data.circles[0]
  const tasks = tab === 'circle' ? circle?.tasks || [] : data.personal
  const unread = useMemo(() => data.circles.reduce((sum, item) => sum + (item.unread || 0), 0), [data.circles])

  const updateTasks = (updater) => setData((current) => {
    if (tab === 'home') return { ...current, personal: updater(current.personal) }
    return { ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, tasks: updater(item.tasks), unread: 0 } : item) }
  })

  const addTask = (title, assignee = 'me', position) => updateTasks((current) => {
    const active = current.filter((task) => !task.done)
    const completed = current.filter((task) => task.done)
    const next = [...active]
    next.splice(Math.max(0, Math.min(position, active.length)), 0, { id: makeId(), title, assignee, done: false, createdAt: Date.now() })
    return [...next, ...completed]
  })
  const completeTask = (id) => updateTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done, completedAt: task.done ? null : new Date().toISOString() } : task))
  const editTask = (id, title) => updateTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task))
  const setAssignee = (id, assignee) => updateTasks((current) => current.map((task) => task.id === id ? { ...task, assignee } : task))

  const switchTab = (next) => { setTab(next); setQuery(null); setFilter(null); setCompletedOpen(false) }
  const selectCircle = (id) => {
    setCircleId(id)
    setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === id ? { ...item, unread: 0 } : item) }))
    setCirclePickerOpen(false)
    setFilter(null)
    setQuery(null)
  }
  const completed = tasks.filter((task) => task.done)
  const clearCompleted = () => { updateTasks((current) => current.filter((task) => !task.done)); setCompletedOpen(false) }

  return <div className="app-shell">
    <section className="phone">
      <Header tab={tab} circle={circle} searchOpen={query !== null} onSearch={() => setQuery((current) => current === null ? '' : null)} onCircleSelect={() => setCirclePickerOpen(true)} onCompleted={() => setCompletedOpen(true)} />
      {tab === 'more' ? <MoreScreen /> : <QueueScreen tasks={tasks} members={members} circle={tab === 'circle' ? circle : null} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} onAdd={addTask} onComplete={completeTask} onEdit={editTask} onAssignee={setAssignee} />}
      <BottomNav tab={tab} unread={unread} onChange={switchTab} />
      {circlePickerOpen && <CirclePicker circles={data.circles} selected={circle?.id} onSelect={selectCircle} onClose={() => setCirclePickerOpen(false)} />}
      {completedOpen && <CompletedSheet tasks={completed} members={members} circle={tab === 'circle' ? circle : null} onRestore={completeTask} onClear={clearCompleted} onClose={() => setCompletedOpen(false)} />}
    </section>
  </div>
}
