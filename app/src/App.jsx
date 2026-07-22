import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import Header from './components/Header.jsx'
import MoreScreen from './components/MoreScreen.jsx'
import QueueScreen from './components/QueueScreen.jsx'
import { CircleEditor, CirclePicker, CompletedSheet, ConfirmDialog } from './components/Sheets.jsx'
import { starterData } from './data.js'
import { localRepository } from './services/localRepository.js'
import { hasSupabaseConfig, supabase } from './services/supabaseClient.js'
import { classifySyncError, userFacingSyncError } from './services/syncError.js'
import { buildInviteMessage, clearPendingInvite, generateInviteCode, normalizeInviteCode, readPendingInvite } from './services/invite.js'
import { createCircle, createCircleTask, createPersonalTask, deleteCircle, deleteTasks, joinCircleByCode, leaveCircle as leaveRemoteCircle, loadCircles, loadPersonalTasks, updateCircle as updateRemoteCircle, updateMemberPositions, updateTask, updateTaskPositions, loadPreferences, savePreferences, logCompletionEvent, markTasksRead } from './services/supabaseRepository.js'
import { CIRCLE_NAME_LIMIT, PROFILE_NAME_LIMIT, graphemeLength, limitGraphemes } from './utils/text.js'

const tabs = ['home', 'circle', 'more']
const freshStarterData = () => JSON.parse(JSON.stringify(starterData))
const withUnreadCounts = (circle) => {
  const unreadTasks = circle.tasks.filter((task) => !task.done && task.sourceUnread)
  const memberUnread = {}
  unreadTasks.forEach((task) => (task.assignees || [task.assignee]).filter(Boolean).forEach((id) => { memberUnread[id] = (memberUnread[id] || 0) + 1 }))
  return { ...circle, unread: unreadTasks.length, unreadDone: circle.tasks.filter((task) => task.done && task.sourceUnread).length, memberUnread }
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [remoteLoading, setRemoteLoading] = useState(hasSupabaseConfig)
  const [syncError, setSyncError] = useState('')
  const [toast, setToast] = useState('')
  const [pendingInvite, setPendingInvite] = useState(readPendingInvite)
  const initialUi = useRef((() => { try { return JSON.parse(localStorage.getItem('kkiu-ui-v1')) || {} } catch { return {} } })()).current
  const [tab, setTab] = useState(initialUi.tab || 'home')
  const [data, setData] = useState(() => hasSupabaseConfig ? { ...freshStarterData(), personal: [], circles: [] } : localRepository.load(freshStarterData()))
  const [circleId, setCircleId] = useState(initialUi.circleId || data.circles[0]?.id)
  const [query, setQuery] = useState(null)
  const [filter, setFilter] = useState(initialUi.filter || null)
  const [queuePositions, setQueuePositions] = useState(initialUi.queuePositions || { home: 4, circle: 3 })
  const [circlePickerOpen, setCirclePickerOpen] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [circleEditorOpen, setCircleEditorOpen] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(null)
  const [focusTaskId, setFocusTaskId] = useState(null)
  const [focusVisit, setFocusVisit] = useState(0)
  const [newTaskIds, setNewTaskIds] = useState(() => new Set())
  const newTaskId = newTaskIds
  const [completedFocusId, setCompletedFocusId] = useState(null)
  const [testMode, setTestMode] = useState(false)
  const swipeRef = useRef(null)
  const authRecoveryRef = useRef(false)
  const testSnapshotRef = useRef(null)
  const activeReadScopeRef = useRef(null)
  const completedReadScopeRef = useRef(null)
  const remoteUser = testMode ? null : session?.user
  const actorId = remoteUser?.id || 'me'

  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => document.body.classList.add('motion-ready')) })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [])

  useEffect(() => {
    if (!hasSupabaseConfig) { setSession(null); setRemoteLoading(false); return undefined }
    supabase.auth.getSession().then(({ data: authData, error }) => { if (error) reportSyncError(error); setSession(authData.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!hasSupabaseConfig || !session?.user) return
    setRemoteLoading(true)
    Promise.all([loadPersonalTasks(session.user.id), loadCircles(session.user.id), loadPreferences(session.user.id)])
      .then(([personal, circles, preferences]) => {
        setData((current) => ({ ...current, personal, circles, settings: { ...current.settings, ...preferences } }))
        setCircleId((current) => circles.some((item) => item.id === current) ? current : circles[0]?.id)
      })
      .catch(reportSyncError)
      .finally(() => setRemoteLoading(false))
  }, [session?.user?.id])

  useEffect(() => { if (!pendingInvite || remoteLoading || (hasSupabaseConfig && !session?.user)) return; setCirclePickerOpen(true) }, [pendingInvite, remoteLoading, session?.user?.id])

  useEffect(() => { if (!hasSupabaseConfig) localRepository.save(data) }, [data])
  useEffect(() => { localStorage.setItem('kkiu-ui-v1', JSON.stringify({ tab, circleId, filter, queuePositions })) }, [tab, circleId, filter, queuePositions])
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 1700); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => { if (!syncError) return undefined; const timer = window.setTimeout(() => setSyncError(''), 3200); return () => window.clearTimeout(timer) }, [syncError])

  const language = data.settings?.language || 'ko'
  const reportSyncError = async (error) => {
    const kind = classifySyncError(error)
    console.warn('[kkiu sync]', kind, error)
    if (kind === 'jwt-clock') {
      setSyncError('')
      if (!authRecoveryRef.current && supabase) {
        authRecoveryRef.current = true
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        window.setTimeout(() => { authRecoveryRef.current = false }, 5000)
        if (!refreshError && refreshed.session) {
          setSession(refreshed.session)
          setToast(language === 'en' ? 'Connection refreshed' : '연결을 다시 맞췄어요')
        }
      }
      return
    }
    if (kind === 'invalid-uuid') {
      setSyncError('')
      setToast(language === 'en' ? 'Reloading server data' : '서버 데이터를 다시 불러올게요')
      window.setTimeout(() => window.location.reload(), 700)
      return
    }
    setSyncError(userFacingSyncError(error, language))
  }
  const circle = data.circles.find((item) => item.id === circleId) || data.circles[0]
  const activeMembers = circle?.members || []
  const tasks = tab === 'circle' ? circle?.tasks || [] : data.personal
  const unread = useMemo(() => data.circles.reduce((sum, item) => sum + (item.unread || 0) + (item.unreadDone || 0), 0), [data.circles])

  const updateTasks = (updater) => setData((current) => {
    if (tab === 'home') return { ...current, personal: updater(current.personal) }
    return { ...current, circles: current.circles.map((item) => item.id === circle?.id ? { ...item, tasks: updater(item.tasks) } : item) }
  })

  const addTask = (title, assignee = 'me', position) => {
    const picked = (Array.isArray(assignee) ? assignee : [assignee]).filter(Boolean)
    const owners = picked.length ? picked : ['me']
    const stamp = Date.now()
    const created = owners.map((member, index) => ({ id: crypto.randomUUID(), title, assignee: member, done: false, createdAt: stamp + index }))
    const createdIds = new Set(created.map((task) => task.id))
    setNewTaskIds(createdIds)
    window.setTimeout(() => setNewTaskIds((current) => current === createdIds ? new Set() : current), 1800)
    const active = tasks.filter((item) => !item.done)
    const completed = tasks.filter((item) => item.done)
    const at = Math.max(0, Math.min(position, active.length))
    const next = [...active]
    next.splice(at, 0, ...created)
    updateTasks(() => [...next, ...completed])
    setQueuePositions((current) => ({ ...current, [tab]: at + created.length }))
    setToast(created.length > 1
      ? (language === 'en' ? `Inserted ${created.length} tasks from #${at + 1}` : `${at + 1}번째부터 할 일 ${created.length}개를 끼웠어요`)
      : (language === 'en' ? `Inserted at #${at + 1}` : `${at + 1}번째에 끼웠어요`))
    if (remoteUser) {
      const creates = created.map((task, index) => tab === 'home' ? createPersonalTask(remoteUser.id, task, at + index) : createCircleTask(remoteUser.id, circle.id, task, at + index))
      Promise.all(creates).then(() => updateTaskPositions(next)).catch(reportSyncError)
    }
  }

  const completeTask = (id) => {
    const currentTask = tasks.find((task) => task.id === id)
    if (!currentTask) return
    const activeItems = tasks.filter((item) => !item.done)
    const completedItems = tasks.filter((item) => item.done)
    let nextActive; let nextTasks; let doneAt = currentTask.doneAt
    if (!currentTask.done) {
      doneAt = activeItems.findIndex((item) => item.id === id)
      nextActive = activeItems.filter((item) => item.id !== id)
      nextTasks = [...nextActive, ...completedItems, { ...currentTask, done: true, completedAt: new Date().toISOString(), doneAt }]
    } else {
      const at = Math.max(0, Math.min(currentTask.doneAt ?? activeItems.length, activeItems.length))
      const restored = { ...currentTask, done: false, completedAt: null }
      nextActive = [...activeItems]; nextActive.splice(at, 0, restored)
      nextTasks = [...nextActive, ...completedItems.filter((item) => item.id !== id)]
    }
    updateTasks(() => nextTasks)
    if (remoteUser) {
      updateTask(id, { done: !currentTask.done, doneAt }).then(() => markTasksRead(remoteUser.id, [id])).then(() => updateTaskPositions(nextActive)).catch(reportSyncError)
      if (!currentTask.done) logCompletionEvent(remoteUser.id, currentTask, tab === 'circle' ? circle?.id : null).catch(reportSyncError)
    }
  }
  const editTask = (id, title) => { updateTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task)); if (remoteUser) updateTask(id, { title }).then(() => markTasksRead(remoteUser.id, [id])).catch(reportSyncError) }
  const setAssignee = (id, assignee) => { updateTasks((current) => current.map((task) => task.id === id ? { ...task, assignee } : task)); if (remoteUser) updateTask(id, { assignee }).then(() => markTasksRead(remoteUser.id, [id])).catch(reportSyncError) }
  const moveTask = (id, direction) => {
    const active = tasks.filter((task) => !task.done), completedItems = tasks.filter((task) => task.done)
    const from = active.findIndex((task) => task.id === id), to = Math.max(0, Math.min(active.length - 1, from + direction))
    if (from < 0 || from === to) return
    const next = [...active], [moved] = next.splice(from, 1); next.splice(to, 0, moved)
    updateTasks(() => [...next, ...completedItems]); if (remoteUser) updateTaskPositions(next).catch(reportSyncError)
  }
  const moveTaskTo = (sourceId, targetId) => {
    const active = tasks.filter((task) => !task.done), completedItems = tasks.filter((task) => task.done)
    const from = active.findIndex((task) => task.id === sourceId), to = active.findIndex((task) => task.id === targetId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...active], [moved] = next.splice(from, 1); next.splice(to, 0, moved)
    updateTasks(() => [...next, ...completedItems]); if (remoteUser) updateTaskPositions(next, sourceId).then(() => markTasksRead(remoteUser.id, [sourceId])).catch(reportSyncError)
  }

  const toggleSelect = (id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const cancelSelect = () => { setSelected(new Set()); setFocusVisit((current) => current + 1) }
  const selectAll = () => setSelected(new Set(tasks.filter((task) => !task.done).map((task) => task.id)))
  const deleteSelected = () => { const ids = [...selected]; updateTasks((current) => current.filter((task) => !selected.has(task.id))); if (remoteUser) deleteTasks(ids).catch(reportSyncError); cancelSelect(); setToast(language === 'en' ? `Deleted ${ids.length}` : `${ids.length}개를 삭제했어요`) }
  const assignSelected = (assignee) => { const ids = [...selected]; updateTasks((current) => current.map((task) => selected.has(task.id) ? { ...task, assignee } : task)); if (remoteUser) Promise.all(ids.map((id) => updateTask(id, { assignee }))).then(() => markTasksRead(remoteUser.id, ids)).catch(reportSyncError); cancelSelect() }

  const switchTab = (next) => { setTab(next); setQuery(null); setFocusTaskId(null); setCompletedOpen(false); cancelSelect() }
  const selectCircle = (id) => { setCircleId(id); setCirclePickerOpen(false); setFilter(null); setQuery(null) }
  const finishPendingInvite = () => { clearPendingInvite(); setPendingInvite('') }
  const joinCircle = async (rawCode, profile) => {
    const normalized = normalizeInviteCode(rawCode)
    const profileName = profile?.name?.trim(); const profileEmoji = profile?.emoji
    if (!normalized || !profileName || !profileEmoji) return false
    if (remoteUser) {
      try {
        const id = await joinCircleByCode(normalized, profileName, profileEmoji)
        const circles = await loadCircles(remoteUser.id)
        setData((current) => ({ ...current, circles })); setCircleId(id); setTab('circle'); setCirclePickerOpen(false); finishPendingInvite(); setToast(language === 'en' ? 'Joined circle' : '끼리에 참여했어요'); return true
      } catch (error) { reportSyncError(error); return false }
    }
    const found = data.circles.find((item) => normalizeInviteCode(item.code) === normalized)
    if (!found) { setToast(language === 'en' ? 'No matching invite code found' : '초대 코드를 찾을 수 없어요'); return false }
    setData((current) => ({ ...current, circles: current.circles.map((item) => item.id !== found.id ? item : { ...item, members: item.members.some((member) => member.id === 'me') ? item.members.map((member) => member.id === 'me' ? { ...member, name: profileName, emoji: profileEmoji } : member) : [...item.members, { id:'me', name:profileName, emoji:profileEmoji, role:'member' }] }) }))
    setCircleId(found.id); setTab('circle'); setCirclePickerOpen(false); finishPendingInvite(); setToast(language === 'en' ? `Joined '${found.name}'` : `${found.name}에 참여했어요`); return true
  }
  const completed = tasks.filter((task) => task.done)
  const clearCompleted = (ids = completed.map((task) => task.id)) => { const idSet = new Set(ids); updateTasks((current) => current.filter((task) => !idSet.has(task.id))); if (remoteUser) deleteTasks(ids).catch(reportSyncError) }
  const requestClearCompleted = (ids = completed.map((task) => task.id)) => setConfirm({ title: language === 'en' ? 'Clear completed tasks' : '완료 목록 비우기', message: language === 'en' ? `Clear ${ids.length} completed tasks?` : `완료된 할 일 ${ids.length}개를 삭제할까요?`, danger:true, action:()=>clearCompleted(ids) })

  const saveCircle = async ({ name, emoji, profileName, profileEmoji }) => {
    const safeName = limitGraphemes(name?.trim(), CIRCLE_NAME_LIMIT)
    const safeProfileName = limitGraphemes(profileName?.trim(), PROFILE_NAME_LIMIT)
    if (!safeName || !safeProfileName || !emoji || !profileEmoji || graphemeLength(name?.trim()) > CIRCLE_NAME_LIMIT || graphemeLength(profileName?.trim()) > PROFILE_NAME_LIMIT) { setToast(language === 'en' ? 'Please shorten the name.' : '이름을 조금 줄여 주세요.'); return }
    const payload = { name: safeName, emoji, profileName: safeProfileName, profileEmoji }
    if (circleEditorOpen === 'create') {
      if (remoteUser) {
        try { const created = await createCircle(remoteUser.id, payload); setData((current) => ({ ...current, circles: [...current.circles, created] })); setCircleId(created.id) } catch (error) { reportSyncError(error); return }
      } else {
        const created = { id: crypto.randomUUID(), name: safeName, emoji, code: generateInviteCode(), members: [{ id: 'me', name: safeProfileName, emoji: profileEmoji, role: 'owner' }], tasks: [], unread: 0, unreadDone: 0, memberUnread: {} }
        setData((current) => ({ ...current, circles: [...current.circles, created] })); setCircleId(created.id)
      }
    } else if (circle) {
      if (remoteUser) { try { await updateRemoteCircle(circle.id, remoteUser.id, payload) } catch (error) { reportSyncError(error); return } }
      setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, name: safeName, emoji, members: item.members.map((member) => member.id === actorId ? { ...member, name: safeProfileName, emoji: profileEmoji } : member) } : item) }))
    }
    if (circleEditorOpen === 'create') { setCircleEditorOpen(null); setCirclePickerOpen(false) } else setCircleEditorOpen('edit'); setToast(language === 'en' ? 'Saved' : '저장했어요')
  }

  const removeCircle = async () => {
    if (!circle) return
    if (remoteUser) { try { await deleteCircle(circle.id) } catch (error) { reportSyncError(error); return } }
    const remaining = data.circles.filter((item) => item.id !== circle.id)
    setData((current) => ({ ...current, circles: remaining })); setCircleId(remaining[0]?.id); setCircleEditorOpen(null); setToast(language === 'en' ? 'Circle deleted' : '끼리를 삭제했어요')
  }
  const requestRemoveCircle = () => setConfirm({ title: language === 'en' ? 'Delete this circle' : '이 끼리 삭제', message: language === 'en' ? `Delete '${circle?.name || 'Circle'}' and all of its to-dos?` : `${circle?.name || '끼리'}와 모든 할 일을 삭제할까요?`, danger: true, action: removeCircle })
  const leaveCircle = async () => {
    if (!circle) return
    if (remoteUser) { try { await leaveRemoteCircle(circle.id, remoteUser.id) } catch (error) { reportSyncError(error); return } }
    const remaining = data.circles.filter((item) => item.id !== circle.id)
    setData((current) => ({ ...current, circles: remaining })); setCircleId(remaining[0]?.id); setCircleEditorOpen(null); setToast(language === 'en' ? `Left '${circle.name}'` : `${circle.name}에서 나왔어요`)
  }
  const requestLeaveCircle = () => setConfirm({ title: language === 'en' ? 'Leave circle' : '끼리 나가기', message: language === 'en' ? `Leave '${circle?.name || 'Circle'}'?` : `${circle?.name || '끼리'}에서 나갈까요?`, danger: true, action: leaveCircle })
  const reorderMembers = (members) => {
    if (!circle) return
    setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, members } : item) }))
    if (remoteUser) updateMemberPositions(circle.id, members).catch(reportSyncError)
  }

  const copyInviteCode = async (code) => { try { await navigator.clipboard.writeText(normalizeInviteCode(code)); setToast(language === 'en' ? 'Invite code copied' : '초대 코드를 복사했어요') } catch { setToast(language === 'en' ? 'Could not copy code' : '코드를 복사하지 못했어요') } }
  const shareInvite = async (payload) => {
    const message = buildInviteMessage({ ...payload, language })
    try {
      if (navigator.share) await navigator.share({ title: language === 'en' ? 'Kkiu Todo invitation' : '끼우 투두 초대', text: message })
      else { await navigator.clipboard.writeText(message); setToast(language === 'en' ? 'Invitation copied' : '초대 메시지를 복사했어요') }
    } catch (error) { if (error?.name !== 'AbortError') setToast(language === 'en' ? 'Could not share invitation' : '초대 메시지를 공유하지 못했어요') }
  }

  const settingValues = { compact: false, motion: true, notifications: true, language: 'ko', slotLocked: false, slotSymbols: ['🌙', '🍊', '🌿'], ...(data.settings || {}) }
  const markTaskIdsRead = useCallback((targetCircleId, taskIds) => {
    const ids = [...new Set(taskIds)]
    if (!ids.length) return
    const idSet = new Set(ids)
    setData((current) => ({ ...current, circles: current.circles.map((item) => item.id !== targetCircleId ? item : withUnreadCounts({ ...item, tasks: item.tasks.map((task) => idSet.has(task.id) ? { ...task, sourceUnread: false } : task) })) }))
    if (remoteUser) markTasksRead(remoteUser.id, ids).catch(reportSyncError)
  }, [remoteUser?.id])
  useEffect(() => {
    const previous = activeReadScopeRef.current
    const nextKey = tab === 'circle' && circle && filter ? `${circle.id}:${filter}` : null
    if (previous && previous.key !== nextKey) {
      activeReadScopeRef.current = null
      markTaskIdsRead(previous.circleId, previous.taskIds)
    }
    if (nextKey) {
      activeReadScopeRef.current = {
        key: nextKey,
        circleId: circle.id,
        taskIds: circle.tasks.filter((task) => !task.done && task.sourceUnread && (task.assignees || [task.assignee]).includes(filter)).map((task) => task.id),
      }
    }
  }, [tab, circle?.id, circle?.tasks, filter, markTaskIdsRead])
  useEffect(() => {
    const previous = completedReadScopeRef.current
    const nextKey = completedOpen && tab === 'circle' && circle ? circle.id : null
    if (previous && previous.circleId !== nextKey) {
      completedReadScopeRef.current = null
      markTaskIdsRead(previous.circleId, previous.taskIds)
    }
    if (nextKey) {
      completedReadScopeRef.current = {
        circleId: circle.id,
        taskIds: circle.tasks.filter((task) => task.done && task.sourceUnread).map((task) => task.id),
      }
    }
  }, [completedOpen, tab, circle?.id, circle?.tasks, markTaskIdsRead])
  const persistSettings = (settings) => { if (remoteUser) savePreferences(remoteUser.id,settings).catch(reportSyncError) }
  const toggleSetting = (id) => { const next={ ...settingValues, [id]: !settingValues[id] }; setData((current) => ({ ...current, settings: next })); persistSettings(next) }
  const setLanguage = (language) => { const next={ ...settingValues, language }; setData((current) => ({ ...current, settings: next })); persistSettings(next) }
  const backupData = () => { const blob = new Blob([JSON.stringify({ version: '1.3.8', exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kkiu-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setToast(language === 'en' ? 'Backup file created' : '백업 파일을 만들었어요') }
  const restoreData = async (file) => { try { const parsed = JSON.parse(await file.text()); const next = parsed.data || parsed; if (!Array.isArray(next.personal) || !Array.isArray(next.circles)) throw new Error('끼우 백업 파일이 아니에요.'); setData(next); setCircleId(next.circles[0]?.id); switchTab('home'); setToast(language === 'en' ? 'Backup restored' : '백업을 복원했어요'); return true } catch(error) { setToast(error instanceof SyntaxError?'JSON 파일 형식이 올바르지 않아요.':(error.message||'백업 파일을 복원하지 못했어요.')); return false } }
  const enterTestMode = (next) => { if (!testMode) testSnapshotRef.current = data; setTestMode(true); setData(next); setCircleId(next.circles[0]?.id); setFilter(null); setSyncError(''); switchTab('home') }
  const exitTestMode = () => { const snapshot = testSnapshotRef.current; setTestMode(false); testSnapshotRef.current = null; if (snapshot) { setData(snapshot); setCircleId(snapshot.circles[0]?.id) } else if (session?.user) window.location.reload(); setToast(language === 'en' ? 'Returned to server data' : '서버 데이터로 돌아왔어요') }
  const doResetData = () => { const next = freshStarterData(); if (session?.user) enterTestMode(next); else { setData(next); setCircleId(next.circles[0]?.id); switchTab('home') } setToast(language === 'en' ? 'Test data added' : '테스트 데이터를 넣었어요') }
  const resetData = () => setConfirm({ title: language === 'en' ? 'Add test data' : '테스트 데이터 넣기', message: session?.user ? (language === 'en' ? 'Use isolated screen-test data? Nothing will be sent to the server.' : '서버에 저장하지 않는 화면 테스트 데이터를 사용할까요?') : (language === 'en' ? 'Replace local data with test data?' : '현재 로컬 데이터를 테스트 데이터로 바꿀까요?'), danger: false, action: doResetData })
  const emptyData = () => setConfirm({ title: language === 'en' ? 'Remove test data' : '테스트 데이터 빼기', message: language === 'en' ? 'Show an empty isolated test screen? Server data will stay untouched.' : '서버 데이터는 그대로 두고 빈 테스트 화면으로 바꿀까요?', danger: true, action: () => { const next={...freshStarterData(),personal:[],circles:[]}; if(session?.user)enterTestMode(next);else{setData(next);setCircleId(undefined)}; setToast(language === 'en' ? 'Test data removed' : '테스트 데이터를 뺐어요') } })
  const createUnread = () => { if (session?.user && !testMode) { testSnapshotRef.current=data; setTestMode(true) } setData((current) => ({ ...current, circles: current.circles.map((c,ci) => ({ ...c, unread: ci===0?Math.min(3,c.tasks.filter((t)=>!t.done).length):0, memberUnread: ci===0?Object.fromEntries(c.members.slice(0,3).map((m)=>[m.id,1])):{}, tasks:c.tasks.map((t,i)=>({...t,sourceUnread:ci===0&&i<3})) })) })); setToast(language === 'en' ? 'Test notifications created' : '테스트 알림을 띄웠어요') }
  const goToSearchResult = (task) => { setNewTaskIds(new Set()); setQuery(null); if (task.done) { setCompletedFocusId(task.id); setCompletedOpen(true); return } setCompletedFocusId(null); setFocusTaskId(task.id); setFocusVisit((current)=>current+1) }

  const startSwipe = (event) => {
    if (event.target.closest('button,input,textarea,label,a,.filter-strip,.assignee-row,.horizontal-resistance,.sheet-layer,.overlay-dialog')) return
    swipeRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }
  const endSwipe = (event) => {
    const start = swipeRef.current; swipeRef.current = null
    if (!start || start.id !== event.pointerId || selected.size) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.35) return
    const index = tabs.indexOf(tab), next = Math.max(0, Math.min(tabs.length - 1, index + (dx < 0 ? 1 : -1)))
    if (next !== index) switchTab(tabs[next])
  }

  if (hasSupabaseConfig && session === undefined) return <div className="app-shell"><section className="phone loading-screen">끼우를 준비하고 있어요…</section></div>
  if (hasSupabaseConfig && !session) return <AuthScreen pendingInvite={pendingInvite} />

  return <div className="wrap">
    <section className={`phone${settingValues.compact ? ' compact-mode' : ''}${settingValues.motion ? '' : ' reduce-motion'}${query!==null?' searching':''}`} onPointerDownCapture={startSwipe} onPointerUpCapture={endSwipe} onPointerCancelCapture={() => { swipeRef.current = null }}>
      <div id="app" className={selected.size ? 'sel-mode' : ''}>
      <Header lang={settingValues.language} tab={tab} circle={circle} searchOpen={query !== null} onSearch={() => setQuery((current) => current === null ? '' : null)} onCircleSelect={() => setCirclePickerOpen(true)} onCompleted={() => setCompletedOpen(true)} onManage={() => setCircleEditorOpen('edit')} />
      {syncError && <button className="sync-error" onClick={() => setSyncError('')}>{syncError}</button>}
      {remoteLoading && !testMode ? <main className="screen-scroll loading-screen">{language === 'en' ? 'Loading to-dos…' : '할 일을 불러오고 있어요…'}</main> : tab === 'more' ? <MoreScreen values={settingValues} onToggle={toggleSetting} user={session?.user} onSignOut={() => supabase?.auth.signOut()} language={settingValues.language} onLanguage={setLanguage} onBackup={backupData} onRestore={restoreData} onReset={resetData} onSeed={resetData} onEmpty={emptyData} onUnread={createUnread} testMode={testMode} onExitTestMode={exitTestMode} /> : <QueueScreen key={`${tab}-${circle?.id || 'none'}-${focusTaskId || ''}-${focusVisit}`} tasks={tasks} members={activeMembers} circle={tab === 'circle' ? circle : null} circleMode={tab === 'circle'} onCreateCircle={() => setCircleEditorOpen('create')} query={query} onQuery={setQuery} onSearchResult={goToSearchResult} focusTaskId={focusTaskId} newTaskId={newTaskId} filter={filter} onFilter={setFilter} onAdd={addTask} onComplete={completeTask} onEdit={editTask} onAssignee={setAssignee} onMove={moveTask} onMoveTo={moveTaskTo} selecting={selected.size > 0} selected={selected} onSelect={toggleSelect} onLongPress={(id) => setSelected(new Set([id]))} onSelectAll={selectAll} onDeleteSelected={deleteSelected} onAssignSelected={assignSelected} onCancelSelect={cancelSelect} onCompleted={() => setCompletedOpen(true)} initialPosition={queuePositions[tab]} onPositionChange={(position) => setQueuePositions((current) => current[tab] === position ? current : { ...current, [tab]: position })} language={settingValues.language} />}
      <BottomNav lang={settingValues.language} tab={tab} unread={unread} onChange={switchTab} />
      {toast && <div className="app-toast" role="status">{toast}</div>}
      {circlePickerOpen && <CirclePicker language={language} initialCode={pendingInvite} onCopyCode={copyInviteCode} circles={data.circles} selected={circle?.id} onSelect={selectCircle} onJoin={joinCircle} onCreate={() => setCircleEditorOpen('create')} onClose={() => setCirclePickerOpen(false)} />}
      {completedOpen && <CompletedSheet language={settingValues.language} tasks={completed} members={activeMembers} circle={tab === 'circle' ? circle : null} onRestore={completeTask} onDelete={(id) => clearCompleted([id])} onClear={requestClearCompleted} focusTaskId={completedFocusId} onClose={() => { setCompletedOpen(false); setCompletedFocusId(null) }} />}
      {circleEditorOpen && <CircleEditor language={settingValues.language} circle={circleEditorOpen === 'edit' ? circle : null} profile={circleEditorOpen === 'edit' ? circle?.members.find((member) => member.id === actorId) : null} onSave={saveCircle} onInvite={shareInvite} onCopyCode={copyInviteCode} onReorder={reorderMembers} onLeave={circleEditorOpen === 'edit' ? requestLeaveCircle : null} onDelete={circleEditorOpen === 'edit' && (circle?.createdBy === actorId || circle?.members.find((member) => member.id === actorId)?.role === 'owner') ? requestRemoveCircle : null} onClose={() => setCircleEditorOpen(null)} />}
      {confirm && <ConfirmDialog language={language} {...confirm} onCancel={() => setConfirm(null)} onConfirm={() => { const action = confirm.action; setConfirm(null); action?.() }} />}
      </div>
    </section>
  </div>
}
