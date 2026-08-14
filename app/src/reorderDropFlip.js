let highlightTimer = 0

const clearReorderHighlights = (stage) => {
  if (!stage) return
  stage.querySelectorAll('.card.reorder-hit').forEach((card) => card.classList.remove('reorder-hit'))
}

const highlightReleasedTask = (stage, taskId) => {
  if (!stage?.isConnected || !taskId) return
  window.clearTimeout(highlightTimer)
  clearReorderHighlights(stage)
  const row = [...stage.querySelectorAll('.queue-task-row[data-task-id]')]
    .find((item) => item.dataset.taskId === taskId)
  const card = row?.querySelector('.card')
  if (!card) return
  card.classList.add('reorder-hit')
  highlightTimer = window.setTimeout(() => {
    if (card.isConnected) card.classList.remove('reorder-hit')
  }, 1750)
}

const onPointerUp = () => {
  const stage = document.querySelector('.stage.q.reordering')
  if (!stage) return
  const taskId = stage.querySelector('.queue-task-row.reorder-dragging[data-task-id]')?.dataset.taskId
  if (!taskId) return

  // Reorder state is committed by the component after this capture-phase listener.
  // Wait for that render, then add only the visual success highlight—no layout,
  // scroll, translate, FLIP, or release correction is performed here.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => highlightReleasedTask(stage, taskId))
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', onPointerUp, true)
}
