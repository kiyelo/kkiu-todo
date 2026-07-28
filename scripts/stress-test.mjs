import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { validateBackupData } from '../app/src/services/backup.js'
import { TASK_TITLE_LIMIT, graphemeLength, normalizeTaskTitle } from '../app/src/utils/text.js'
import { loadLocalData, saveLocalData } from '../app/src/services/localRepository.js'

const task = (id, title = `Task ${id}`) => ({ id, title, done: false })
const valid = {
  personal: [task('p1')],
  circles: [{
    id: 'c1',
    name: 'Circle',
    emoji: '🌿',
    members: [{ id: 'me', name: 'Me', emoji: '🙂' }],
    tasks: [task('c1t1')],
  }],
  settings: { language: 'ko' },
}

const expectCode = (code, action) => assert.throws(action, (error) => error?.code === code)
const family = '👨‍👩‍👧‍👦'
const limited = normalizeTaskTitle(`  ${family.repeat(TASK_TITLE_LIMIT + 20)}  `)
assert.equal(graphemeLength(limited), TASK_TITLE_LIMIT)

const normalized = validateBackupData({ data: valid })
assert.equal(normalized.personal[0].title, 'Task p1')
assert.equal(normalized.circles[0].unread, 0)
assert.equal(normalized.settings.language, 'ko')

expectCode('BACKUP_INVALID_SHAPE', () => validateBackupData({ personal: [], circles: [{ ...valid.circles[0], tasks: null }] }))
expectCode('BACKUP_DUPLICATE_ID', () => validateBackupData({ personal: [task('same'), task('same')], circles: [] }))
expectCode('BACKUP_INVALID_TASK', () => validateBackupData({ personal: [task('long', family.repeat(TASK_TITLE_LIMIT + 1))], circles: [] }))
expectCode('BACKUP_INVALID_MEMBER', () => validateBackupData({ personal: [], circles: [{ ...valid.circles[0], members: [{ id: 'me', name: '', emoji: '🙂' }] }] }))
expectCode('BACKUP_TOO_MANY_ITEMS', () => validateBackupData({ personal: Array.from({ length: 2001 }, (_, index) => task(`p${index}`)), circles: [] }))

const large = {
  personal: Array.from({ length: 2000 }, (_, index) => task(`p${index}`, `${index} · ${'한글🙂'.repeat(30)}`)),
  circles: [],
  settings: {},
}
const started = performance.now()
assert.equal(validateBackupData(large).personal.length, 2000)
const validationMs = Math.round((performance.now() - started) * 100) / 100

const fixtureIndex = process.argv.indexOf('--fixture')
if (fixtureIndex >= 0 && process.argv[fixtureIndex + 1]) {
  writeFileSync(process.argv[fixtureIndex + 1], JSON.stringify({ version: '1.4.0', data: large }))
}

const fallback = structuredClone(valid)
globalThis.localStorage = {
  getItem: () => '{"personal":[],"circles":[{"id":"broken","tasks":null}]}',
  setItem: () => {},
}
assert.deepEqual(loadLocalData(fallback), fallback)
globalThis.localStorage.setItem = () => { throw new Error('quota') }
assert.equal(saveLocalData(valid), false)

console.log(JSON.stringify({
  pass: true,
  checks: 10,
  taskTitleGraphemeLimit: TASK_TITLE_LIMIT,
  largeBackupTasks: 2000,
  validationMs,
}, null, 2))
