const HIGHLIGHT_CLASS = 'reorder-hit'
const HIGHLIGHT_MS = 1750
let highlightTimer = 0

function clearReorderHighlight(stage) {
  if (!stage) return
  stage.querySelectorAll(`.card.${HIGHLIGHT_CLASS}`).forEach((card) => card.classList.remove(HIGHLIGHT_CLASS))
}

function highlightReorderedTask(stage, taskId) {
  if (!stage?.isConnected || !taskId) return

  window.clearTimeout(highlightTimer)
  clearReorderHighlight(stage)

  const row = [...stage.querySelectorAll('.queue-task-row[data-task-id]')]
    .find((item) => item.dataset.taskId === taskId)
  const card = row?.querySelector('.card')
  if (!card) return

  card.classList.add(HIGHLIGHT_CLASS)
  highlightTimer = window.setTimeout(() => {
    if (card.isConnected) card.classList.remove(HIGHLIGHT_CLASS)
  }, HIGHLIGHT_MS)
}

function handleReorderPointerUp() {
  const stage = document.querySelector('.stage.q.reordering')
  if (!stage) return

  const taskId = stage.querySelector('.queue-task-row.reorder-dragging[data-task-id]')?.dataset.taskId
  if (!taskId) return

  // QueueScreen commits the reorder after this capture-phase listener. Two
  // frames later the final DOM is stable; only add a visual cue. This module
  // must never change layout, translate rows, or alter scrollTop.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => highlightReorderedTask(stage, taskId))
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', handleReorderPointerUp, true)
}
