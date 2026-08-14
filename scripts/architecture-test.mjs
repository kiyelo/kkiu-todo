import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const exists = (path) => existsSync(resolve(root, path))
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const main = read('app/src/main.jsx')
const styleEntry = read('app/src/styles/index.css')
const queueStyles = read('app/src/styles/queue.css')
const highlightStyles = read('app/src/styles/taskHighlight.css')
const reorderHighlight = read('app/src/interactions/reorderHighlight.js')
const reorderHighlightCode = stripComments(reorderHighlight)

const obsoleteRuntimeFiles = [
  'app/src/queueNativeScroll.css',
  'app/src/queuePerformance.css',
  'app/src/reorderFix.css',
  'app/src/successHighlight.css',
  'app/src/reorderDropFlip.js',
  'app/src/legacy/AppSupabase.jsx',
]

const generatedRootArtifacts = [
  'index.html',
  '404.html',
  'assets',
]

const highlightTriggers = [
  '.card.new-hit',
  '.card.search-hit',
  '.card.reorder-hit',
  '.card.success-highlight',
  '.drow.target-hit',
]

const reorderOwnsLayoutOrScroll = /\bscrollTop\b|\.scrollTo\s*\(|getBoundingClientRect\s*\(|\.animate\s*\(|style\.translate\b|translate3d\s*\(|style\.transform\b/.test(reorderHighlightCode)

const checks = [
  ['Runtime entry imports one stylesheet entrypoint', main.includes("import './styles/index.css'") && !main.includes("import './styles/queue.css'") && !main.includes("import './styles/taskHighlight.css'")],
  ['Style entrypoint keeps base before feature overrides', styleEntry.indexOf("@import '../styles.css'") < styleEntry.indexOf("@import './queue.css'") && styleEntry.indexOf("@import './queue.css'") < styleEntry.indexOf("@import './taskHighlight.css'")],
  ['Runtime entry imports reorder highlight interaction', main.includes("import './interactions/reorderHighlight.js'")],
  ['Runtime entry no longer imports superseded queue/reorder modules', !main.includes('queueNativeScroll.css') && !main.includes('queuePerformance.css') && !main.includes('reorderFix.css') && !main.includes('successHighlight.css') && !main.includes('reorderDropFlip.js')],
  ['Superseded runtime files are removed', obsoleteRuntimeFiles.every((path) => !exists(path))],
  ['Generated root web artifacts are not committed', generatedRootArtifacts.every((path) => !exists(path))],
  ['Queue styles preserve one native floating layer architecture', queueStyles.includes('.qvp > .queue-floating-layer') && queueStyles.includes('position: sticky') && queueStyles.includes('height: 0')],
  ['Queue styles preserve immediate reorder release', queueStyles.includes('.stage.q.reordering .qtrack') && queueStyles.includes('.stage.q:not(.reordering) .queue-task-row') && queueStyles.includes('transition: none !important')],
  ['All task-target triggers use the shared highlight stylesheet', highlightTriggers.every((selector) => highlightStyles.includes(selector))],
  ['Shared highlight does not animate surface brightness or geometry', !highlightStyles.includes('filter:') && !highlightStyles.includes('transform:') && !highlightStyles.includes('translate:')],
  ['Reorder highlight does not own layout or scroll', !reorderOwnsLayoutOrScroll],
  ['Reorder highlight is pointer-up visual feedback only', reorderHighlightCode.includes("addEventListener('pointerup'") && reorderHighlightCode.includes("HIGHLIGHT_CLASS = 'reorder-hit'")],
]

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name)
console.log(JSON.stringify({ pass: failed.length === 0, checks: checks.length, failed }, null, 2))
if (failed.length) process.exit(1)
