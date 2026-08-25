import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  enqueueTaskCreates,
  flushPendingTaskCreates,
  loadPendingTaskCreates,
  mergePendingTaskCreates,
} from '../app/src/services/remoteSyncQueue.js'

const memoryStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

const operation = (id, position, circleId = null) => ({
  id,
  position,
  circleId,
  task: { id, title: `task-${id}`, done: false, createdAt: position },
})

const storage = memoryStorage()
enqueueTaskCreates('user-1', [operation('a', 1), operation('b', 0, 'circle-1')], storage)
enqueueTaskCreates('user-1', [operation('a', 0)], storage)
assert.deepEqual(loadPendingTaskCreates('user-1', storage).map(({ id, position }) => [id, position]), [['a', 0], ['b', 0]])

const merged = mergePendingTaskCreates({
  personal: [{ id: 'existing', title: 'existing', done: false }],
  circles: [{ id: 'circle-1', tasks: [{ id: 'done', title: 'done', done: true }] }],
  settings: {},
}, loadPendingTaskCreates('user-1', storage))
assert.deepEqual(merged.personal.map(({ id }) => id), ['a', 'existing'])
assert.deepEqual(merged.circles[0].tasks.map(({ id }) => id), ['b', 'done'])

await assert.rejects(
  flushPendingTaskCreates('user-1', async ({ id }) => {
    if (id === 'b') throw new Error('offline')
  }, storage),
  /offline/,
)
assert.deepEqual(loadPendingTaskCreates('user-1', storage).map(({ id }) => id), ['b'])
await flushPendingTaskCreates('user-1', async () => {}, storage)
assert.deepEqual(loadPendingTaskCreates('user-1', storage), [])

const concurrentStorage = memoryStorage()
enqueueTaskCreates('user-2', [operation('c', 0)], concurrentStorage)
let releaseFirst
const firstStarted = new Promise((resolve) => { releaseFirst = resolve })
let unblockFirst
const firstBlocked = new Promise((resolve) => { unblockFirst = resolve })
const flushed = flushPendingTaskCreates('user-2', async ({ id }) => {
  if (id === 'c') {
    releaseFirst()
    await firstBlocked
  }
}, concurrentStorage)
await firstStarted
enqueueTaskCreates('user-2', [operation('d', 1)], concurrentStorage)
unblockFirst()
await flushed
assert.deepEqual(loadPendingTaskCreates('user-2', concurrentStorage), [])

const root = resolve(import.meta.dirname, '..')
const appSource = readFileSync(resolve(root, 'app/src/App.jsx'), 'utf8')
const repositorySource = readFileSync(resolve(root, 'app/src/services/supabaseRepository.js'), 'utf8')
assert(!appSource.includes("if (event === 'TOKEN_REFRESHED') setRemoteReloadKey"))
assert(appSource.includes('enqueueTaskCreates(remoteUser.id, queuedCreates)'))
assert(appSource.includes('mergePendingTaskCreates'))
assert(repositorySource.includes("{ onConflict: 'id', ignoreDuplicates: true }"))

console.log(JSON.stringify({ pass: true, checks: 11 }, null, 2))
