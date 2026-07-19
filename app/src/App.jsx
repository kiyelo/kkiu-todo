import { useEffect, useMemo, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Header from './components/Header.jsx'
import MoreScreen from './components/MoreScreen.jsx'
import QueueScreen from './components/QueueScreen.jsx'
import { CircleEditor, CirclePicker, CompletedSheet } from './components/Sheets.jsx'
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
  const [circleEditorOpen, setCircleEditorOpen] = useState(null)
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])

  const circle = data.circles.find((item) => item.id === circleId) || data.circles[0]
  const activeMembers = members.map((member) => member.id === 'me' && circle?.profile ? { ...member, name: circle.profile.name, emoji: circle.profile.emoji } : member)
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
  const moveTask = (id, direction) => updateTasks((current) => {
    const active = current.filter((task) => !task.done)
    const completedItems = current.filter((task) => task.done)
    const from = active.findIndex((task) => task.id === id)
    const to = Math.max(0, Math.min(active.length - 1, from + direction))
    if (from < 0 || from === to) return current
    const next = [...active]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return [...next, ...completedItems]
  })
  const toggleSelect = (id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const startSelect = (id) => setSelected(new Set([id]))
  const cancelSelect = () => setSelected(new Set())
  const selectAll = () => setSelected(new Set(tasks.filter((task) => !task.done).map((task) => task.id)))
  const deleteSelected = () => { updateTasks((current) => current.filter((task) => !selected.has(task.id))); cancelSelect() }

  const switchTab = (next) => { setTab(next); setQuery(null); setFilter(null); setCompletedOpen(false); cancelSelect() }
  const selectCircle = (id) => {
    setCircleId(id)
    setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === id ? { ...item, unread: 0 } : item) }))
    setCirclePickerOpen(false)
    setFilter(null)
    setQuery(null)
  }
  const completed = tasks.filter((task) => task.done)
  const clearCompleted = () => { updateTasks((current) => current.filter((task) => !task.done)); setCompletedOpen(false) }
  const saveCircle = ({ name, emoji, profileName, profileEmoji }) => {
    if (circleEditorOpen === 'create') {
      const id = makeId()
      setData((current) => ({ ...current, circles: [...current.circles, { id, name, emoji, unread: 0, tasks: [], profile: { name: profileName, emoji: profileEmoji } }] }))
      setCircleId(id)
    } else {
      setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, name, emoji, profile: { name: profileName, emoji: profileEmoji } } : item) }))
    }
    setCircleEditorOpen(null)
    setCirclePickerOpen(false)
  }
  const deleteCircle = () => {
    setData((current) => ({ ...current, circles: current.circles.filter((item) => item.id !== circle.id) }))
    const next = data.circles.find((item) => item.id !== circle.id)
    setCircleId(next?.id)
    setCircleEditorOpen(null)
  }
  const settingValues = { compact: false, motion: true, notifications: true, ...(data.settings || {}) }
  const toggleSetting = (id) => setData((current) => ({ ...current, settings: { ...settingValues, [id]: !settingValues[id] } }))

  return <div className={`app-shell${settingValues.compact ? ' compact-mode' : ''}${settingValues.motion ? '' : ' reduce-motion'}`}>
    <section className="phone">
      <Header tab={tab} circle={circle} searchOpen={query !== null} onSearch={() => setQuery((current) => current === null ? '' : null)} onCircleSelect={() => setCirclePickerOpen(true)} onCompleted={() => setCompletedOpen(true)} onManage={() => setCircleEditorOpen('edit')} />
      {tab === 'more' ? <MoreScreen values={settingValues} onToggle={toggleSetting} /> : <QueueScreen tasks={tasks} members={activeMembers} circle={tab === 'circle' ? circle : null} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} onAdd={addTask} onComplete={completeTask} onEdit={editTask} onAssignee={setAssignee} onMove={moveTask} selecting={selected.size > 0} selected={selected} onSelect={toggleSelect} onLongPress={startSelect} onSelectAll={selectAll} onDeleteSelected={deleteSelected} onCancelSelect={cancelSelect} />}
      <BottomNav tab={tab} unread={unread} onChange={switchTab} />
      {circlePickerOpen && <CirclePicker circles={data.circles} selected={circle?.id} onSelect={selectCircle} onCreate={() => setCircleEditorOpen('create')} onClose={() => setCirclePickerOpen(false)} />}
      {completedOpen && <CompletedSheet tasks={completed} members={activeMembers} circle={tab === 'circle' ? circle : null} onRestore={completeTask} onClear={clearCompleted} onClose={() => setCompletedOpen(false)} />}
      {circleEditorOpen && <CircleEditor circle={circleEditorOpen === 'edit' ? circle : null} profile={circleEditorOpen === 'edit' ? circle?.profile : null} onSave={saveCircle} onDelete={circleEditorOpen === 'edit' && data.circles.length > 1 ? deleteCircle : null} onClose={() => setCircleEditorOpen(null)} />}
    </section>
  </div>
}
