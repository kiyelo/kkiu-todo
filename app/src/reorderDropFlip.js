let pending = null
let observer = null
let releaseTimer = 0
let highlightTimer = 0
let settleFrame = 0

const taskRows = (stage) => [...stage.querySelectorAll('.queue-task-row[data-task-id]')]

const snapshotRows = (stage) => new Map(
  taskRows(stage).map((row) => [row.dataset.taskId, row.getBoundingClientRect().top]),
)

const clearReorderHighlights = (stage) => {
  if (!stage) return
  stage.querySelectorAll('.card.reorder-hit').forEach((card) => card.classList.remove('reorder-hit'))
}

const highlightReleasedTask = (stage, taskId) => {
  if (!stage) return
  window.clearTimeout(highlightTimer)
  clearReorderHighlights(stage)
  if (!taskId) return
  const row = taskRows(stage).find((item) => item.dataset.taskId === taskId)
  const card = row?.querySelector('.card')
  if (!card) return
  void card.offsetWidth
  card.classList.add('reorder-hit')
  highlightTimer = window.setTimeout(() => {
    if (card.isConnected) card.classList.remove('reorder-hit')
  }, 1750)
}

const clearRowHold = (stage) => {
  taskRows(stage).forEach((row) => {
    row.style.translate = ''
    row.style.willChange = ''
  })
}

const measureSettledRows = (stage, originalPositions) => {
  const rows = taskRows(stage)
  rows.forEach((row) => { row.style.translate = 'none' })
  const layout = new Map(rows.map((row) => [row.dataset.taskId, row.getBoundingClientRect().top]))
  rows.forEach((row) => {
    const originalTop = originalPositions.get(row.dataset.taskId)
    const layoutTop = layout.get(row.dataset.taskId)
    if (originalTop == null || layoutTop == null) return
    row.style.translate = `0 ${originalTop - layoutTop}px`
    row.style.willChange = 'translate'
  })
  return layout
}

const layoutsMatch = (previous, next) => {
  if (!previous || previous.size !== next.size) return false
  for (const [id, top] of next) {
    const before = previous.get(id)
    if (before == null || Math.abs(before - top) > 0.5) return false
  }
  return true
}

const finishRelease = () => {
  if (!pending) return
  clearRowHold(pending.stage)
  pending.stage?.classList.remove('reorder-releasing')
  pending = null
}

const applyFinalFlip = (layout) => {
  if (!pending || pending.applied) return
  const { stage, positions, taskId, shouldHighlight } = pending
  if (!stage?.isConnected) { pending = null; return }

  pending.applied = true
  taskRows(stage).forEach((row) => {
    const previousTop = positions.get(row.dataset.taskId)
    const nextTop = layout.get(row.dataset.taskId)
    if (previousTop == null || nextTop == null) return
    const delta = previousTop - nextTop
    row.style.translate = 'none'
    row.style.willChange = 'translate'
    row.getAnimations?.().forEach((animation) => animation.cancel())
    if (Math.abs(delta) < 0.5) {
      row.style.translate = ''
      row.style.willChange = ''
      return
    }
    const animation = row.animate(
      [
        { translate: `0 ${delta}px` },
        { translate: '0 0' },
      ],
      { duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
    )
    animation.onfinish = () => {
      animation.cancel()
      row.style.translate = ''
      row.style.willChange = ''
    }
  })

  if (shouldHighlight) highlightReleasedTask(stage, taskId)
  window.clearTimeout(releaseTimer)
  releaseTimer = window.setTimeout(finishRelease, 220)
}

const sampleFinalLayout = () => {
  settleFrame = 0
  if (!pending || pending.applied) return
  const { stage, positions } = pending
  if (!stage?.isConnected) { pending = null; return }
  if (stage.classList.contains('reordering')) {
    settleFrame = requestAnimationFrame(sampleFinalLayout)
    return
  }

  const layout = measureSettledRows(stage, positions)
  if (layoutsMatch(pending.lastLayout, layout)) pending.stableFrames += 1
  else pending.stableFrames = 0
  pending.lastLayout = layout
  pending.attempts += 1

  if (pending.stableFrames >= 1 || pending.attempts >= 5) {
    applyFinalFlip(layout)
    return
  }
  settleFrame = requestAnimationFrame(sampleFinalLayout)
}

const scheduleFinalLayout = () => {
  if (!pending || pending.applied) return
  cancelAnimationFrame(settleFrame)
  settleFrame = requestAnimationFrame(sampleFinalLayout)
}

const onPointerEnd = (event) => {
  const stage = document.querySelector('.stage.q.reordering')
  if (!stage) return
  const dragged = stage.querySelector('.queue-task-row.reorder-dragging[data-task-id]')
  window.clearTimeout(releaseTimer)
  cancelAnimationFrame(settleFrame)
  pending = {
    stage,
    positions: snapshotRows(stage),
    taskId: dragged?.dataset.taskId || null,
    shouldHighlight: event.type === 'pointerup',
    applied: false,
    lastLayout: null,
    stableFrames: 0,
    attempts: 0,
  }
  stage.classList.add('reorder-releasing')
  queueMicrotask(() => {
    if (!pending) return
    measureSettledRows(stage, pending.positions)
    scheduleFinalLayout()
  })
}

const ensureObserver = () => {
  if (observer || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver(() => {
    if (!pending || pending.applied) return
    pending.stableFrames = 0
    scheduleFinalLayout()
  })
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', onPointerEnd, true)
  window.addEventListener('pointercancel', onPointerEnd, true)
  ensureObserver()
}
