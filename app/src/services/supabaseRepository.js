import { requireSupabase } from './supabaseClient.js'

const taskFromRow = (row) => ({
  id: row.id,
  title: row.title,
  done: Boolean(row.completed_at),
  completedAt: row.completed_at,
  createdAt: new Date(row.created_at).getTime(),
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
  const { error } = await requireSupabase().from('tasks').update(payload).eq('id', taskId)
  if (error) throw error
}

export async function updatePersonalPositions(tasks) {
  const client = requireSupabase()
  const results = await Promise.all(tasks.map((task, position) => client.from('tasks').update({ position }).eq('id', task.id)))
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}

export async function deletePersonalTasks(taskIds) {
  if (!taskIds.length) return
  const { error } = await requireSupabase().from('tasks').delete().in('id', taskIds)
  if (error) throw error
}
