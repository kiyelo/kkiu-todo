import { TASK_TITLE_LIMIT, graphemeLength } from '../utils/text.js'

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024
export const MAX_PERSONAL_TASKS = 2000
export const MAX_CIRCLES = 100
export const MAX_TASKS_PER_CIRCLE = 2000
export const MAX_MEMBERS_PER_CIRCLE = 200
const MAX_ASSIGNEES = 50
const MAX_ID_LENGTH = 128

export class BackupValidationError extends Error {
  constructor(code) {
    super(code)
    this.name = 'BackupValidationError'
    this.code = code
  }
}

const fail = (code) => { throw new BackupValidationError(code) }
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const validId = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_ID_LENGTH
const uniqueIds = (items) => {
  const ids = new Set()
  items.forEach((item) => {
    if (ids.has(item.id)) fail('BACKUP_DUPLICATE_ID')
    ids.add(item.id)
  })
}

const normalizeTask = (task) => {
  if (!isRecord(task) || !validId(task.id) || typeof task.title !== 'string') fail('BACKUP_INVALID_TASK')
  const title = task.title.trim()
  if (!title || graphemeLength(title) > TASK_TITLE_LIMIT) fail('BACKUP_INVALID_TASK')
  if (task.assignee != null && !validId(task.assignee)) fail('BACKUP_INVALID_TASK')
  if (task.assignees != null && (!Array.isArray(task.assignees) || task.assignees.length > MAX_ASSIGNEES || task.assignees.some((id) => !validId(id)))) fail('BACKUP_INVALID_TASK')
  return { ...task, title, done: Boolean(task.done) }
}

const normalizeMember = (member) => {
  if (!isRecord(member) || !validId(member.id) || typeof member.name !== 'string' || !member.name.trim() || typeof member.emoji !== 'string' || !member.emoji) fail('BACKUP_INVALID_MEMBER')
  return { ...member, name: member.name.trim() }
}

const normalizeTaskList = (tasks, limit) => {
  if (!Array.isArray(tasks)) fail('BACKUP_INVALID_SHAPE')
  if (tasks.length > limit) fail('BACKUP_TOO_MANY_ITEMS')
  const normalized = tasks.map(normalizeTask)
  uniqueIds(normalized)
  return normalized
}

export function validateBackupData(input) {
  const value = isRecord(input?.data) ? input.data : input
  if (!isRecord(value) || !Array.isArray(value.personal) || !Array.isArray(value.circles)) fail('BACKUP_INVALID_SHAPE')
  if (value.circles.length > MAX_CIRCLES) fail('BACKUP_TOO_MANY_ITEMS')

  const personal = normalizeTaskList(value.personal, MAX_PERSONAL_TASKS)
  const circles = value.circles.map((circle) => {
    if (!isRecord(circle) || !validId(circle.id) || typeof circle.name !== 'string' || !circle.name.trim() || typeof circle.emoji !== 'string' || !Array.isArray(circle.members) || !Array.isArray(circle.tasks)) fail('BACKUP_INVALID_SHAPE')
    if (circle.members.length > MAX_MEMBERS_PER_CIRCLE) fail('BACKUP_TOO_MANY_ITEMS')
    const members = circle.members.map(normalizeMember)
    uniqueIds(members)
    return {
      ...circle,
      name: circle.name.trim(),
      members,
      tasks: normalizeTaskList(circle.tasks, MAX_TASKS_PER_CIRCLE),
      unread: Number.isFinite(circle.unread) ? Math.max(0, circle.unread) : 0,
      unreadDone: Number.isFinite(circle.unreadDone) ? Math.max(0, circle.unreadDone) : 0,
      memberUnread: isRecord(circle.memberUnread) ? circle.memberUnread : {},
    }
  })
  uniqueIds(circles)

  return {
    ...value,
    personal,
    circles,
    settings: isRecord(value.settings) ? value.settings : {},
  }
}

export function backupErrorMessage(error, language = 'ko') {
  if (error instanceof SyntaxError) return language === 'en' ? 'The JSON file is not valid.' : 'JSON 파일 형식이 올바르지 않아요.'
  const code = error?.code || error?.message
  const messages = {
    BACKUP_TOO_LARGE: ['백업 파일은 5MB 이하여야 해요.', 'Backup files must be 5 MB or smaller.'],
    BACKUP_TOO_MANY_ITEMS: ['백업에 항목이 너무 많아요.', 'The backup contains too many items.'],
    BACKUP_DUPLICATE_ID: ['백업에 중복된 항목 ID가 있어요.', 'The backup contains duplicate item IDs.'],
    BACKUP_INVALID_TASK: ['백업에 올바르지 않은 할 일이 있어요.', 'The backup contains an invalid task.'],
    BACKUP_INVALID_MEMBER: ['백업에 올바르지 않은 멤버가 있어요.', 'The backup contains an invalid member.'],
    BACKUP_INVALID_SHAPE: ['끼우 백업 파일이 아니에요.', 'This is not a Kkiu backup file.'],
  }
  return messages[code]?.[language === 'en' ? 1 : 0] || (language === 'en' ? 'Could not restore the backup.' : '백업 파일을 복원하지 못했어요.')
}
