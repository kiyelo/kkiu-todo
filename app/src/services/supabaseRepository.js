import { requireSupabase } from './supabaseClient.js'

const taskFromRow = (row) => ({
  id: row.id,
  title: row.title,
  done: Boolean(row.completed_at),
  completedAt: row.completed_at,
  createdAt: new Date(row.created_at).getTime(),
  assignee: row.assignee_id,
})

const memberFromRow = (row) => ({
  id: row.user_id,
  name: row.nickname || '멤버',
  emoji: row.emoji || '🙂',
  role: row.role,
})

export async function loadPersonalTasks(userId) {
  const { data, error } = await requireSupabase()
    .from('tasks')
    .select('id,title,position,completed_at,created_at')
    .eq('owner_id', userId)
    .is('circle_id', null)
    .order('position', { ascending: true })

  if (error) throw error
  return data.map(taskFromRow)
}

export async function loadCircles() {
  const client = requireSupabase()
  const { data: circles, error: circleError } = await client
    .from('circles')
    .select('id,name,emoji,created_by,created_at')
    .order('created_at', { ascending: true })
  if (circleError) throw circleError
  if (!circles.length) return []

  const ids = circles.map((circle) => circle.id)
  const [{ data: memberRows, error: memberError }, { data: taskRows, error: taskError }] = await Promise.all([
    client.from('circle_members').select('circle_id,user_id,role,nickname,emoji,joined_at').in('circle_id', ids).order('joined_at', { ascending: true }),
    client.from('tasks').select('id,owner_id,circle_id,assignee_id,title,position,completed_at,created_at').in('circle_id', ids).order('position', { ascending: true }),
  ])
  if (memberError) throw memberError
  if (taskError) throw taskError

  return circles.map((circle) => ({
    id: circle.id,
    name: circle.name,
    emoji: circle.emoji,
    createdBy: circle.created_by,
    unread: 0,
    memberUnread: {},
    members: memberRows.filter((row) => row.circle_id === circle.id).map(memberFromRow),
    tasks: taskRows.filter((row) => row.circle_id === circle.id).map(taskFromRow),
  }))
}

export async function createCircle(userId, { name, emoji, profileName, profileEmoji }) {
  const client = requireSupabase()
  const { data: circle, error: circleError } = await client
    .from('circles')
    .insert({ name, emoji, created_by: userId })
    .select('id,name,emoji,created_by')
    .single()
  if (circleError) throw circleError

  const { error: memberError } = await client.from('circle_members').insert({
    circle_id: circle.id,
    user_id: userId,
    role: 'owner',
    nickname: profileName,
    emoji: profileEmoji,
  })
  if (memberError) {
    await client.from('circles').delete().eq('id', circle.id)
    throw memberError
  }

  return {
    id: circle.id,
    name: circle.name,
    emoji: circle.emoji,
    createdBy: circle.created_by,
    unread: 0,
    memberUnread: {},
    members: [{ id: userId, name: profileName, emoji: profileEmoji, role: 'owner' }],
    tasks: [],
  }
}

export async function updateCircle(circleId, userId, { name, emoji, profileName, profileEmoji }) {
  const client = requireSupabase()
  const [{ error: circleError }, { error: memberError }] = await Promise.all([
    client.from('circles').update({ name, emoji }).eq('id', circleId),
    client.from('circle_members').update({ nickname: profileName, emoji: profileEmoji }).eq('circle_id', circleId).eq('user_id', userId),
  ])
  if (circleError) throw circleError
  if (memberError) throw memberError
}

export async function deleteCircle(circleId) {
  const { error } = await requireSupabase().from('circles').delete().eq('id', circleId)
  if (error) throw error
}

export async function createCircleTask(userId, circleId, task, position) {
  const { error } = await requireSupabase().from('tasks').insert({
    id: task.id,
    owner_id: userId,
    circle_id: circleId,
    assignee_id: task.assignee || null,
    title: task.title,
    position,
  })
  if (error) throw error
}

export async function createPersonalTask(userId, task, position) {
  const { error } = await requireSupabase().from('tasks').insert({
    id: task.id,
    owner_id: userId,
    title: task.title,
    position,
  })
  if (error) throw error
}

export async function updatePersonalTask(taskId, changes) {
  const payload = {}
  if (changes.title !== undefined) payload.title = changes.title
  if (changes.done !== undefined) payload.completed_at = changes.done ? new Date().toISOString() : null
  if (changes.assignee !== undefined) payload.assignee_id = changes.assignee || null
  const { error } = await requireSupabase().from('tasks').update(payload).eq('id', taskId)
  if (error) throw error
}

export const updateTask = updatePersonalTask

export async function updatePersonalPositions(tasks) {
  const client = requireSupabase()
  const results = await Promise.all(tasks.map((task, position) => client.from('tasks').update({ position }).eq('id', task.id)))
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}

export const updateTaskPositions = updatePersonalPositions

export async function deletePersonalTasks(taskIds) {
  if (!taskIds.length) return
  const { error } = await requireSupabase().from('tasks').delete().in('id', taskIds)
  if (error) throw error
}

export const deleteTasks = deletePersonalTasks
