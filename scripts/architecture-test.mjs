import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const exists = (path) => existsSync(resolve(root, path))

const main = read('app/src/main.jsx')
const queueStyles = read('app/src/styles/queue.css')
const highlightStyles = read('app/src/styles/taskHighlight.css')
const reorderHighlight = read('app/src/interactions/reorderHighlight.js')

const obsoleteRuntimeFiles = [
  'app/src/queueNativeScroll.css',
  'app/src/queuePerformance.css',
  'app/src/reorderFix.css',
  'app/src/successHighlight.css',
  'app/src/reorderDropFlip.js',
  'app/src/legacy/AppSupabase.jsx',
]

const highlightTriggers = [
  '.card.new-hit',
  '.card.search-hit',
  '.card.reorder-hit',
  '.card.success-highlight',
  '.drow.target-hit',
]

const checks = [
  ['Runtime entry imports consolidated queue styles', main.includes("import './styles/queue.css'")],
  ['Runtime entry imports shared task highlight styles', main.includes("import './styles/taskHighlight.css'")],
  ['Runtime entry imports reorder highlight interaction', main.includes("import './interactions/reorderHighlight.js'")],
  ['Runtime entry no longer imports superseded queue/reorder modules', !main.includes('queueNativeScroll.css') && !main.includes('queuePerformance.css') && !main.includes('reorderFix.css') && !main.includes('successHighlight.css') && !main.includes('reorderDropFlip.js')],
  ['Superseded runtime files are removed', obsoleteRuntimeFiles.every((path) => !exists(path))],
  ['Queue styles preserve one native floating layer architecture', queueStyles.includes('.qvp > .queue-floating-layer') && queueStyles.includes('position: sticky') && queueStyles.includes('height: 0')],
  ['Queue styles preserve immediate reorder release', queueStyles.includes('.stage.q.reordering .qtrack') && queueStyles.includes('.stage.q:not(.reordering) .queue-task-row') && queueStyles.includes('transition: none !important')],
  ['All task-target triggers use the shared highlight stylesheet', highlightTriggers.every((selector) => highlightStyles.includes(selector))],
  ['Shared highlight does not animate surface brightness or geometry', !highlightStyles.includes('filter:') && !highlightStyles.includes('transform:') && !highlightStyles.includes('translate:')],
  ['Reorder highlight does not own layout or scroll', !reorderHighlight.includes('scrollTop') && !reorderHighlight.includes('scrollTo') && !reorderHighlight.includes('getBoundingClientRect') && !reorderHighlight.includes('.animate(') && !reorderHighlight.includes('translate')],
  ['Reorder highlight is pointer-up visual feedback only', reorderHighlight.includes("addEventListener('pointerup'") && reorderHighlight.includes("HIGHLIGHT_CLASS = 'reorder-hit'")],
]

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name)
console.log(JSON.stringify({ pass: failed.length === 0, checks: checks.length, failed }, null, 2))
if (failed.length) process.exit(1)
