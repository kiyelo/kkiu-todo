import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import TermsGate from './components/TermsGate.jsx'
import Header from './components/Header.jsx'
import MoreScreen from './components/MoreScreen.jsx'
import QueueScreen from './components/QueueScreen.jsx'
import { ActivityLogSheet, CircleEditor, CirclePicker, CompletedSheet, ConfirmDialog } from './components/Sheets.jsx'
import { starterData } from './data.js'
import { localRepository } from './services/localRepository.js'
import { hasSupabaseConfig, supabase } from './services/supabaseClient.js'
import { hasAcceptedRequiredTerms, loadAcceptedTermsVersions } from './services/termsRepository.js'
import { classifySyncError, userFacingSyncError } from './services/syncError.js'
import { buildInviteMessage, clearPendingInvite, generateInviteCode, normalizeInviteCode, readPendingInvite } from './services/invite.js'
import { createCircle, createCircleTask, createPersonalTask, deleteTasks, joinCircleByCode, leaveCircle as leaveRemoteCircle, loadCircleActivityLogs, loadCircles, loadPersonalTasks, regenerateInviteCode, setCircleJoinLock, updateCircle as updateRemoteCircle, updateTask, updateTaskPositions, loadPreferences, savePreferences, logCompletionEvent, markTasksRead } from './services/supabaseRepository.js'
import { CIRCLE_NAME_LIMIT, PROFILE_NAME_LIMIT, graphemeLength, limitGraphemes, normalizeTaskTitle } from './utils/text.js'
import { BackupValidationError, MAX_BACKUP_BYTES, backupErrorMessage, validateBackupData } from './services/backup.js'
import { getNormalLoginUrl, getQaUrl, getSelectedQaAccount } from './services/qaAuth.js'

const tabs = ['home', 'circle', 'more']
const freshStarterData = () => JSON.parse(JSON.stringify(starterData))
async function writeClipboard(text) {
  if (!text) throw new Error('EMPTY_CLIPBOARD_TEXT')
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {}

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('CLIPBOARD_COPY_FAILED')
}

const withUnreadCounts = (circle) => {
  const unreadTasks = circle.tasks.filter((task) => !task.done && task.sourceUnread)
  const memberUnread = {}
  unreadTasks.forEach((task) => (task.assignees || [task.assignee]).filter(Boolean).forEach((id) => { memberUnread[id] = (memberUnread[id] || 0) + 1 }))
  return { ...circle, unread: unreadTasks.length, unreadDone: circle.tasks.filter((task) => task.done && task.sourceUnread).length, memberUnread }
}

export default function App() {
  const qaAccount = getSelectedQaAccount()
  const [session, setSession] = useState(undefined)
  const [qaLoginError, setQaLoginError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(undefined)
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
  const [activityOpen, setActivityOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(null)
  const [focusTaskId, setFocusTaskId] = useState(null)
  const [focusVisit, setFocusVisit] = useState(0)
  const [newTaskIds, setNewTaskIds] = useState(() => new Set())
  const newTaskId = newTaskIds
  const [completedFocusId, setCompletedFocusId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [testMode, setTestMode] = useState(false)
  const swipeRef = useRef(null)
  const authRecoveryRef = useRef(false)
  const testSnapshotRef = useRef(null)
  const activeReadScopeRef = useRef(null)
  const completedReadScopeRef = useRef(null)
  const pendingDeleteRef = useRef(null)
  const pendingDeleteTimerRef = useRef(null)
  const remoteUser = testMode ? null : session?.user
  const actorId = remoteUser?.id || 'me'

  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => document.body.classList.add('motion-ready')) })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [])

  useEffect(() => {
    if (!hasSupabaseConfig) { setSession(null); setRemoteLoading(false); return undefined }
    let cancelled = false
    const startSession = async () => {
      const { data: authData, error } = await supabase.auth.getSession()
      if (cancelled) return
      if (error) reportSyncError(error)
      if (authData.session || !qaAccount) {
        setSession(authData.session)
        return
      }
      if (!qaAccount.password) {
        setQaLoginError(`${qaAccount.label} 비밀번호가 .env.local에 설정되지 않았어요.`)
        setSession(null)
        setRemoteLoading(false)
        return
      }
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: qaAccount.email,
        password: qaAccount.password,
      })
      if (cancelled) return
      if (signInError) {
        setQaLoginError(signInError.message || 'QA 자동 로그인에 실패했어요.')
        setSession(null)
        setRemoteLoading(false)
        return
      }
      setSession(signedIn.session)
    }
    startSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!hasSupabaseConfig || !session?.user) { setTermsAccepted(undefined); return undefined }
    if (qaAccount) { setTermsAccepted(true); return undefined }
    let cancelled = false
    loadAcceptedTermsVersions(session.user.id)
      .then((accepted) => { if (!cancelled) setTermsAccepted(hasAcceptedRequiredTerms(accepted)) })
      .catch((error) => {
        reportSyncError(error)
        if (!cancelled) setTermsAccepted(true)
      })
    return () => { cancelled = true }
  }, [session?.user?.id])

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

  useEffect(() => {
    if (!hasSupabaseConfig && !localRepository.save(data)) {
      setSyncError(data.settings?.language === 'en' ? 'Local storage is full. Your latest change was not saved.' : '저장 공간이 부족해 최근 변경을 저장하지 못했어요.')
    }
  }, [data])
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
  const activeMembers = useMemo(() => {
    const members = (circle?.members || []).filter((member) => !member.leftAt || circle.tasks.some((task) => (task.assignees || [task.assignee]).includes(member.id)))
    const savedOrder = data.settings?.memberOrderByCircle?.[circle?.id]
    const memberById = new Map(members.map((member) => [member.id, member]))
    const orderedIds = Array.isArray(savedOrder) ? savedOrder.filter((id) => memberById.has(id) && id !== actorId) : []
    const orderedSet = new Set(orderedIds)
    const ordered = orderedIds.map((id) => memberById.get(id))
    const newMembers = members.filter((member) => member.id !== actorId && !orderedSet.has(member.id))
    const self = memberById.get(actorId)
    return self ? [self, ...ordered, ...newMembers] : [...ordered, ...newMembers]
  }, [actorId, circle?.id, circle?.members, circle?.tasks, data.settings?.memberOrderByCircle])
  const displayCircle = circle ? { ...circle, members: activeMembers } : circle
  const tasks = tab === 'circle' ? circle?.tasks || [] : data.personal
  const unread = useMemo(() => data.circles.reduce((sum, item) => sum + (item.unread || 0) + (item.unreadDone || 0), 0), [data.circles])

  const updateTasks = (updater) => setData((current) => {
    if (tab === 'home') return { ...current, personal: updater(current.personal) }
    return { ...current, circles: current.circles.map((item) => item.id === circle?.id ? { ...item, tasks: updater(item.tasks) } : item) }
  })

  const addTask = (title, assignee = 'me', position) => {
    const safeTitle = normalizeTaskTitle(title)
    if (!safeTitle) return
    const picked = (Array.isArray(assignee) ? assignee : [assignee]).filter(Boolean)
    const owners = picked.length ? picked : ['me']
    const stamp = Date.now()
    const created = owners.map((member, index) => ({ id: crypto.randomUUID(), title: safeTitle, assignee: member, done: false, createdAt: stamp + index }))
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
  const editTask = (id, title) => { const safeTitle = normalizeTaskTitle(title); if (!safeTitle) return; updateTasks((current) => current.map((task) => task.id === id ? { ...task, title: safeTitle } : task)); if (remoteUser) updateTask(id, { title: safeTitle }).then(() => markTasksRead(remoteUser.id, [id])).catch(reportSyncError) }
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
  const deleteSelected = () => { stageTaskDelete([...selected]); cancelSelect() }
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
    if (found.joinLocked) { setToast(language === 'en' ? 'This Circle is not accepting new members' : '지금은 새로 들어갈 수 없어요'); return false }
    setData((current) => ({ ...current, circles: current.circles.map((item) => item.id !== found.id ? item : { ...item, members: item.members.some((member) => member.id === 'me') ? item.members.map((member) => member.id === 'me' ? { ...member, name: profileName, emoji: profileEmoji } : member) : [...item.members, { id:'me', name:profileName, emoji:profileEmoji }] }) }))
    setCircleId(found.id); setTab('circle'); setCirclePickerOpen(false); finishPendingInvite(); setToast(language === 'en' ? `Joined '${found.name}'` : `${found.name}에 참여했어요`); return true
  }
  const completed = tasks.filter((task) => task.done)
  const commitPendingDelete = () => {
  const pending = pendingDeleteRef.current
  if (!pending) return
  window.clearTimeout(pendingDeleteTimerRef.current)
  pendingDeleteRef.current = null
  pendingDeleteTimerRef.current = null
  setPendingDelete(null)
  if (pending.remoteIds.length) deleteTasks([...new Set(pending.remoteIds)]).catch(reportSyncError)
}
const stageTaskDelete = (ids) => {
  const idSet = new Set(ids)
  if (!idSet.size) return
  const circleIdAtDelete = tab === 'circle' ? circle?.id : null
  const source = circleIdAtDelete ? data.circles.find((item) => item.id === circleIdAtDelete)?.tasks || [] : data.personal
  const items = source.map((task, index) => ({ task, index })).filter((item) => idSet.has(item.task.id))
  if (!items.length) return
  window.clearTimeout(pendingDeleteTimerRef.current)
  const deletedIds = new Set(items.map((item) => item.task.id))
  const previous = pendingDeleteRef.current
  const batch = { items, circleId: circleIdAtDelete }
  const pending = {
    batches: [...(previous?.batches || []), batch],
    count: (previous?.count || 0) + items.length,
    remoteIds: [...(previous?.remoteIds || []), ...(remoteUser ? items.map((item) => item.task.id) : [])],
  }
  setData((current) => batch.circleId
    ? { ...current, circles: current.circles.map((item) => item.id === batch.circleId ? { ...item, tasks: item.tasks.filter((task) => !deletedIds.has(task.id)) } : item) }
    : { ...current, personal: current.personal.filter((task) => !deletedIds.has(task.id)) })
  pendingDeleteRef.current = pending
  setPendingDelete(pending)
  pendingDeleteTimerRef.current = window.setTimeout(commitPendingDelete, 5000)
}
const deleteCompletedTask = (id) => stageTaskDelete([id])
const undoTaskDelete = () => {
  const pending = pendingDeleteRef.current
  if (!pending) return
  window.clearTimeout(pendingDeleteTimerRef.current)
  pendingDeleteRef.current = null
  pendingDeleteTimerRef.current = null
  setPendingDelete(null)
  const restoreBatch = (currentItems, batch) => {
    const existingIds = new Set(currentItems.map((task) => task.id))
    const restoredItems = batch.items.filter((item) => !existingIds.has(item.task.id)).sort((a, b) => a.index - b.index)
    if (!restoredItems.length) return currentItems
    const next = [...currentItems]
    restoredItems.forEach((item) => next.splice(Math.min(item.index, next.length), 0, item.task))
    return next
  }
  setData((current) => {
    let personal = current.personal
    let circles = current.circles
    ;[...pending.batches].reverse().forEach((batch) => {
      if (batch.circleId) {
        circles = circles.map((item) => item.id === batch.circleId ? { ...item, tasks: restoreBatch(item.tasks, batch) } : item)
      } else {
        personal = restoreBatch(personal, batch)
      }
    })
    return { ...current, personal, circles }
  })
}

  const saveCircle = async ({ name, emoji, profileName, profileEmoji }) => {
    const safeName = limitGraphemes(name?.trim(), CIRCLE_NAME_LIMIT)
    const safeProfileName = limitGraphemes(profileName?.trim(), PROFILE_NAME_LIMIT)
    if (!safeName || !safeProfileName || !emoji || !profileEmoji || graphemeLength(name?.trim()) > CIRCLE_NAME_LIMIT || graphemeLength(profileName?.trim()) > PROFILE_NAME_LIMIT) { setToast(language === 'en' ? 'Please shorten the name.' : '이름을 조금 줄여 주세요.'); return }
    const payload = { name: safeName, emoji, profileName: safeProfileName, profileEmoji }
    if (circleEditorOpen === 'create') {
      if (remoteUser) {
        try { const created = await createCircle(remoteUser.id, payload); setData((current) => ({ ...current, circles: [...current.circles, created] })); setCircleId(created.id) } catch (error) { reportSyncError(error); return }
      } else {
        const created = { id: crypto.randomUUID(), name: safeName, emoji, code: generateInviteCode(), joinLocked: false, members: [{ id: 'me', name: safeProfileName, emoji: profileEmoji }], tasks: [], unread: 0, unreadDone: 0, memberUnread: {} }
        setData((current) => ({ ...current, circles: [...current.circles, created] })); setCircleId(created.id)
      }
    } else if (circle) {
      if (remoteUser) { try { await updateRemoteCircle(circle.id, remoteUser.id, payload) } catch (error) { reportSyncError(error); return } }
      setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, name: safeName, emoji, members: item.members.map((member) => member.id === actorId ? { ...member, name: safeProfileName, emoji: profileEmoji } : member) } : item) }))
    }
    if (circleEditorOpen === 'create') { setCircleEditorOpen(null); setCirclePickerOpen(false) } else setCircleEditorOpen('edit'); setToast(language === 'en' ? 'Saved' : '저장했어요')
  }

  const leaveCircle = async () => {
    if (!circle) return
    if (remoteUser) { try { await leaveRemoteCircle(circle.id, remoteUser.id) } catch (error) { reportSyncError(error); return } }
    const remaining = data.circles.filter((item) => item.id !== circle.id)
    setData((current) => ({ ...current, circles: remaining })); setCircleId(remaining[0]?.id); setCircleEditorOpen(null); setToast(language === 'en' ? `Left '${circle.name}'` : `${circle.name}에서 나왔어요`)
  }
  const requestLeaveCircle = () => {
    if (!circle) return
    const assignedCount = circle.tasks.filter((task) => !task.done && (task.assignees || [task.assignee]).includes(actorId)).length
    setConfirm({
      title: language === 'en' ? `Leave ${circle.name}?` : `${circle.emoji} ${circle.name}에서 나갈까요?`,
      message: language === 'en'
        ? `${assignedCount} task${assignedCount === 1 ? '' : 's'} assigned to me will become unassigned.\nYou will need an invite code to join again.`
        : `내가 담당인 할 일 ${assignedCount}개는 담당자 없음으로 바뀝니다.\n다시 들어오려면 초대 코드가 필요합니다.`,
      confirmLabel: language === 'en' ? 'Leave' : '나가기',
      danger: true,
      action: leaveCircle,
    })
  }
  const refreshInviteCode = async () => {
    if (!circle) return
    try {
      const code = remoteUser ? await regenerateInviteCode(circle.id) : generateInviteCode()
      setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, code } : item) }))
      setToast(language === 'en' ? 'Invite code regenerated' : '초대 코드를 새로 받았어요')
    } catch (error) { reportSyncError(error) }
  }
  const changeJoinLock = async (locked) => {
    if (!circle) return
    try {
      if (remoteUser) await setCircleJoinLock(circle.id, locked)
      setData((current) => ({ ...current, circles: current.circles.map((item) => item.id === circle.id ? { ...item, joinLocked: locked } : item) }))
    } catch (error) { reportSyncError(error) }
  }
  const reorderMembers = (members) => {
    if (!circle) return
    const nextSettings = {
      ...(data.settings || {}),
      memberOrderByCircle: {
        ...(data.settings?.memberOrderByCircle || {}),
        [circle.id]: members.map((member) => member.id).filter((id) => id !== actorId),
      },
    }
    setData((current) => ({ ...current, settings: nextSettings }))
    if (remoteUser) savePreferences(remoteUser.id, nextSettings).catch(reportSyncError)
  }

  const copyInviteCode = async (code) => { try { await writeClipboard(normalizeInviteCode(code)); setToast(language === 'en' ? 'Invite code copied' : '초대 코드를 복사했어요') } catch { setToast(language === 'en' ? 'Could not copy code' : '코드를 복사하지 못했어요') } }
  const shareInvite = async (payload) => {
    const message = buildInviteMessage({ ...payload, language })
    try {
      if (navigator.share) await navigator.share({ title: language === 'en' ? 'Kkiu Todo invitation' : '끼우 투두 초대', text: message })
      else { await writeClipboard(message); setToast(language === 'en' ? 'Invitation copied' : '초대 메시지를 복사했어요') }
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
  const backupData = () => { const blob = new Blob([JSON.stringify({ version: '1.4.0', exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kkiu-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setToast(language === 'en' ? 'Backup file created' : '백업 파일을 만들었어요') }
  const restoreData = async (file) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupValidationError('BACKUP_TOO_LARGE')
      const next = validateBackupData(JSON.parse(await file.text()))
      setData(next); setCircleId(next.circles[0]?.id); switchTab('home')
      setToast(language === 'en' ? 'Backup restored' : '백업을 복원했어요')
      return true
    } catch (error) {
      setToast(backupErrorMessage(error, language))
      return false
    }
  }
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
  if (hasSupabaseConfig && qaAccount && !session && qaLoginError) return <QaLoginError account={qaAccount} message={qaLoginError} />
  if (hasSupabaseConfig && !session) return <AuthScreen pendingInvite={pendingInvite} />

  if (hasSupabaseConfig && session?.user && termsAccepted === false) {
    return (
      <TermsGate
        userId={session.user.id}
        language={settingValues.language}
        onAccepted={() => setTermsAccepted(true)}
      />
    )
  }

  return <div className="wrap">
    {qaAccount && session && <QaAccountBadge account={qaAccount} />}
    <section className={`phone${settingValues.compact ? ' compact-mode' : ''}${settingValues.motion ? '' : ' reduce-motion'}${query!==null?' searching':''}`} onPointerDownCapture={startSwipe} onPointerUpCapture={endSwipe} onPointerCancelCapture={() => { swipeRef.current = null }}>
      <div id="app" className={selected.size ? 'sel-mode' : ''}>
      <Header lang={settingValues.language} tab={tab} circle={circle} searchOpen={query !== null} onSearch={() => setQuery((current) => current === null ? '' : null)} onCircleSelect={() => setCirclePickerOpen(true)} onCompleted={() => setCompletedOpen(true)} onManage={() => setCircleEditorOpen('edit')} />
      {syncError && <button className="sync-error" onClick={() => setSyncError('')}>{syncError}</button>}
      {remoteLoading && !testMode ? <main className="screen-scroll loading-screen">{language === 'en' ? 'Loading to-dos…' : '할 일을 불러오고 있어요…'}</main> : tab === 'more' ? <MoreScreen values={settingValues} onToggle={toggleSetting} user={qaAccount ? null : session?.user} onSignOut={qaAccount ? undefined : () => supabase?.auth.signOut()} language={settingValues.language} onLanguage={setLanguage} onBackup={backupData} onRestore={restoreData} onReset={resetData} onSeed={resetData} onEmpty={emptyData} onUnread={createUnread} testMode={testMode} onExitTestMode={exitTestMode} /> : <QueueScreen key={`${tab}-${circle?.id || 'none'}-${focusTaskId || ''}-${focusVisit}`} tasks={tasks} members={activeMembers} circle={tab === 'circle' ? displayCircle : null} circleMode={tab === 'circle'} onCreateCircle={() => setCircleEditorOpen('create')} onJoinCircle={() => setCirclePickerOpen(true)} query={query} onQuery={setQuery} onSearchResult={goToSearchResult} focusTaskId={focusTaskId} newTaskId={newTaskId} filter={filter} onFilter={setFilter} onAdd={addTask} onComplete={completeTask} onEdit={editTask} onAssignee={setAssignee} onMove={moveTask} onMoveTo={moveTaskTo} selecting={selected.size > 0} selected={selected} onSelect={toggleSelect} onLongPress={(id) => setSelected(new Set([id]))} onSelectAll={selectAll} onDeleteSelected={deleteSelected} onAssignSelected={assignSelected} onCancelSelect={cancelSelect} onCompleted={() => setCompletedOpen(true)} initialPosition={queuePositions[tab]} onPositionChange={(position) => setQueuePositions((current) => current[tab] === position ? current : { ...current, [tab]: position })} language={settingValues.language} />}
      <BottomNav lang={settingValues.language} tab={tab} unread={unread} onChange={switchTab} />
      {pendingDelete ? <div className="app-toast undo-toast" role="status"><span>{language === 'en' ? `${pendingDelete.count} deleted ·` : `${pendingDelete.count}개 삭제됨 ·`}</span><button type="button" onClick={undoTaskDelete}>{language === 'en' ? 'Undo' : '되돌리기'}</button></div> : toast && <div className="app-toast" role="status">{toast}</div>}
      {circlePickerOpen && <CirclePicker language={language} initialCode={pendingInvite} circles={data.circles} selected={circle?.id} onSelect={selectCircle} onJoin={joinCircle} onCreate={() => setCircleEditorOpen('create')} onClose={() => setCirclePickerOpen(false)} />}
      {completedOpen && <CompletedSheet language={settingValues.language} tasks={completed} members={activeMembers} circle={tab === 'circle' ? displayCircle : null} onRestore={completeTask} onDelete={deleteCompletedTask} focusTaskId={completedFocusId} onClose={() => { setCompletedOpen(false); setCompletedFocusId(null) }} />}
      {circleEditorOpen && <CircleEditor language={settingValues.language} circle={circleEditorOpen === 'edit' ? displayCircle : null} profile={circleEditorOpen === 'edit' ? activeMembers.find((member) => member.id === actorId) : null} onSave={saveCircle} onInvite={shareInvite} onCopyCode={copyInviteCode} onRegenerate={refreshInviteCode} onJoinLock={changeJoinLock} onActivity={circleEditorOpen === 'edit' ? () => { setCircleEditorOpen(null); setActivityOpen(true) } : null} onReorder={reorderMembers} onLeave={circleEditorOpen === 'edit' ? requestLeaveCircle : null} onClose={() => setCircleEditorOpen(null)} />}
      {activityOpen && circle && <ActivityLogSheet language={settingValues.language} circle={circle} loadPage={(offset, limit) => remoteUser ? loadCircleActivityLogs(circle.id, offset, limit) : Promise.resolve([])} onClose={() => { setActivityOpen(false); setCircleEditorOpen('edit') }} />}
      {confirm && <ConfirmDialog language={language} {...confirm} onCancel={() => setConfirm(null)} onConfirm={() => { const action = confirm.action; setConfirm(null); action?.() }} />}
      </div>
    </section>
  </div>
}

function QaAccountBadge({ account }) {
  const other = account.id === 'a' ? 'b' : 'a'
  return (
    <aside className="qa-account-badge" aria-label="개발 QA 계정">
      <span><b>{account.label}</b> · {account.email}</span>
      <a href={getQaUrl(other)} target="_blank" rel="noreferrer">QA {other.toUpperCase()} 새 탭</a>
      <a href={getNormalLoginUrl()}>로그인 화면</a>
    </aside>
  )
}

function QaLoginError({ account, message }) {
  const other = account.id === 'a' ? 'b' : 'a'
  return (
    <div className="app-shell">
      <section className="phone qa-login-error">
        <span>🧪</span>
        <h1>{account.label} 자동 로그인 실패</h1>
        <code>{account.email}</code>
        <p>{message}</p>
        <a href={getQaUrl(other)}>QA {other.toUpperCase()}로 시도</a>
        <a href={getNormalLoginUrl()}>일반 로그인 화면 열기</a>
      </section>
    </div>
  )
}
