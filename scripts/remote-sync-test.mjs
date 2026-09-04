import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  enqueueTaskCreates,
  flushPendingTaskCreates,
  loadPendingTaskCreates,
  mergePendingTaskCreates,
} from '../app/src/services/remoteSyncQueue.js'
import {
  enqueueTaskMutation,
  flushPendingTaskMutations,
  loadPendingTaskMutations,
  mergePendingTaskMutations,
} from '../app/src/services/taskMutationOutbox.js'
import {
  clearLastRemoteUser,
  loadLastRemoteSnapshot,
  saveRemoteSnapshot,
} from '../app/src/services/remoteCache.js'

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

const mutationStorage = memoryStorage()
enqueueTaskMutation('user-m', { id: 'u1', kind: 'update', taskId: 'task-1', changes: { title: 'one' } }, mutationStorage)
enqueueTaskMutation('user-m', { id: 'u2', kind: 'update', taskId: 'task-1', changes: { assignee: 'member-2' } }, mutationStorage)
assert.equal(loadPendingTaskMutations('user-m', mutationStorage).length, 1)
assert.deepEqual(loadPendingTaskMutations('user-m', mutationStorage)[0].changes, { title: 'one', assignee: 'member-2' })
enqueueTaskMutation('user-m', { id: 'p1', kind: 'positions', taskIds: ['task-2', 'task-1'] }, mutationStorage)
enqueueTaskMutation('user-m', { id: 'd1', kind: 'delete', taskIds: ['task-3'] }, mutationStorage)
const executedKinds = []
await assert.rejects(
  flushPendingTaskMutations('user-m', async (pending) => {
    executedKinds.push(pending.kind)
    if (pending.kind === 'positions') throw new Error('offline-mutation')
  }, mutationStorage),
  /offline-mutation/,
)
assert.deepEqual(executedKinds, ['update', 'positions'])
assert.deepEqual(loadPendingTaskMutations('user-m', mutationStorage).map(({ kind }) => kind), ['positions', 'delete'])
await flushPendingTaskMutations('user-m', async () => {}, mutationStorage)
assert.deepEqual(loadPendingTaskMutations('user-m', mutationStorage), [])

const replayed = mergePendingTaskMutations({
  personal: [
    { id: 'task-1', title: 'old', done: false },
    { id: 'task-2', title: 'two', done: false },
    { id: 'task-3', title: 'three', done: false },
  ],
  circles: [],
  settings: {},
}, [
  { id: 'ru', kind: 'update', taskId: 'task-1', changes: { title: 'edited', done: true, doneAt: 0 }, queuedAt: '2026-09-04T00:00:00.000Z' },
  { id: 'rp', kind: 'positions', taskIds: ['task-2', 'task-3'] },
  { id: 'rd', kind: 'delete', taskIds: ['task-3'] },
])
assert.deepEqual(replayed.personal.map(({ id }) => id), ['task-2', 'task-1'])
assert.equal(replayed.personal.find(({ id }) => id === 'task-1').title, 'edited')
assert.equal(replayed.personal.find(({ id }) => id === 'task-1').done, true)

const compactStorage = memoryStorage()
enqueueTaskMutation('user-c', { id: 'cu', kind: 'update', taskId: 'gone', changes: { title: 'edited' } }, compactStorage)
enqueueTaskMutation('user-c', { id: 'cp', kind: 'positions', taskIds: ['gone', 'keep'] }, compactStorage)
enqueueTaskMutation('user-c', { id: 'cd', kind: 'delete', taskIds: ['gone'] }, compactStorage)
enqueueTaskMutation('user-c', { id: 'cu2', kind: 'update', taskId: 'gone', changes: { title: 'must-not-return' } }, compactStorage)
assert.deepEqual(loadPendingTaskMutations('user-c', compactStorage).map(({ kind }) => kind), ['positions', 'delete'])
assert.deepEqual(loadPendingTaskMutations('user-c', compactStorage)[0].taskIds, ['keep'])

const previousLocalStorage = globalThis.localStorage
const bootstrapStorage = memoryStorage()
globalThis.localStorage = bootstrapStorage
const bootstrapSnapshot = {
  personal: [
    { id: 'cached-1', title: 'cached-1', done: false },
    { id: 'cached-2', title: 'cached-2', done: false },
    { id: 'cached-3', title: 'cached-3', done: false },
  ],
  circles: [],
  settings: { language: 'ko' },
}
assert.equal(saveRemoteSnapshot('user-3', bootstrapSnapshot), true)
enqueueTaskCreates('user-3', [operation('new-offline', 1)])
enqueueTaskMutation('user-3', { id: 'bu', kind: 'update', taskId: 'new-offline', changes: { title: 'edited offline' } })
enqueueTaskMutation('user-3', { id: 'bp', kind: 'positions', taskIds: ['cached-2', 'new-offline', 'cached-1', 'cached-3'] })
enqueueTaskMutation('user-3', { id: 'bd', kind: 'delete', taskIds: ['cached-3'] })
const hydratedBootstrap = loadLastRemoteSnapshot()
assert.equal(hydratedBootstrap.userId, 'user-3')
assert.deepEqual(hydratedBootstrap.snapshot.personal.map(({ id }) => id), ['cached-2', 'new-offline', 'cached-1'])
assert.equal(hydratedBootstrap.snapshot.personal.find(({ id }) => id === 'new-offline').title, 'edited offline')
clearLastRemoteUser('another-user')
assert.equal(loadLastRemoteSnapshot().userId, 'user-3')
clearLastRemoteUser('user-3')
assert.equal(loadLastRemoteSnapshot(), null)
globalThis.localStorage = previousLocalStorage

const root = resolve(import.meta.dirname, '..')
const appSource = readFileSync(resolve(root, 'app/src/App.jsx'), 'utf8')
const authScreenSource = readFileSync(resolve(root, 'app/src/components/AuthScreen.jsx'), 'utf8')
const authBootstrapSource = readFileSync(resolve(root, 'app/src/services/authBootstrap.js'), 'utf8')
const mainSource = readFileSync(resolve(root, 'app/src/main.jsx'), 'utf8')
const clientSource = readFileSync(resolve(root, 'app/src/services/supabaseClient.js'), 'utf8')
const repositorySource = readFileSync(resolve(root, 'app/src/services/supabaseRepository.js'), 'utf8')
const remoteCacheSource = readFileSync(resolve(root, 'app/src/services/remoteCache.js'), 'utf8')
assert(!appSource.includes("if (event === 'TOKEN_REFRESHED') setRemoteReloadKey"))
assert(appSource.includes('enqueueTaskCreates(remoteUser.id, queuedCreates)'))
assert(appSource.includes('mergePendingTaskCreates'))
assert(appSource.includes('loadLastRemoteSnapshot'))
assert(appSource.includes('restoringCachedSession'))
assert(!mainSource.includes('getSession()'))
assert(!mainSource.includes('restoreInitialSession'))
assert(appSource.includes('if (hasSupabaseConfig && session === null) return <AuthScreen pendingInvite={pendingInvite} />'))
assert(!mainSource.includes('restoreStartupTabForExistingSession'))
assert(clientSource.includes('setRestoredSession'))
assert(authBootstrapSource.includes('hasRestoredSession'))
assert(authScreenSource.includes('if (hasRestoredSession())'))
assert(repositorySource.includes('flushDurableTaskMutations(userId)'))
assert(repositorySource.includes("kind: 'update'"))
assert(repositorySource.includes("kind: 'positions'"))
assert(repositorySource.includes("kind: 'delete'"))
assert(repositorySource.includes("{ onConflict: 'id', ignoreDuplicates: true }"))
assert(remoteCacheSource.includes('mergePendingTaskMutations'))
assert(remoteCacheSource.includes('mergePendingTaskCreates'))

console.log(JSON.stringify({ pass: true, checks: 43 }, null, 2))
