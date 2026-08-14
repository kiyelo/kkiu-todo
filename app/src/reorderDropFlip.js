let pending = null
let observer = null
let releaseTimer = 0
let highlightTimer = 0

const taskRows = (stage) => [...stage.querySelectorAll('.queue-task-row[data-task-id]')]

const snapshotRows = (stage) => new Map(
  taskRows(stage).map((row) => [row.dataset.taskId, row.getBoundingClientRect().top]),
)

const highlightReleasedTask = (stage, taskId) => {
  if (!stage || !taskId) return
  const row = taskRows(stage).find((item) => item.dataset.taskId === taskId)
  const card = row?.querySelector('.card')
  if (!card) return
  window.clearTimeout(highlightTimer)
  card.classList.remove('reorder-hit')
  void card.offsetWidth
  card.classList.add('reorder-hit')
  highlightTimer = window.setTimeout(() => card.classList.remove('reorder-hit'), 1750)
}

const finishRelease = () => {
  if (!pending) return
  pending.stage?.classList.remove('reorder-releasing')
  pending = null
}

const applyFlip = () => {
  if (!pending || pending.applied) return
  const { stage, positions, taskId, shouldHighlight } = pending
  if (!stage?.isConnected) { pending = null; return }
  if (stage.classList.contains('reordering')) return

  pending.applied = true
  taskRows(stage).forEach((row) => {
    const previousTop = positions.get(row.dataset.taskId)
    if (previousTop == null) return
    const nextTop = row.getBoundingClientRect().top
    const delta = previousTop - nextTop
    if (Math.abs(delta) < 0.5) return
    row.getAnimations?.().forEach((animation) => animation.cancel())
    row.animate(
      [
        { transform: `translate3d(0,${delta}px,0)` },
        { transform: 'translate3d(0,0,0)' },
      ],
      { duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)' },
    )
  })

  if (shouldHighlight) highlightReleasedTask(stage, taskId)

  window.clearTimeout(releaseTimer)
  releaseTimer = window.setTimeout(finishRelease, 210)
}

const onPointerEnd = (event) => {
  const stage = document.querySelector('.stage.q.reordering')
  if (!stage) return
  const dragged = stage.querySelector('.queue-task-row.reorder-dragging[data-task-id]')
  window.clearTimeout(releaseTimer)
  pending = {
    stage,
    positions: snapshotRows(stage),
    taskId: dragged?.dataset.taskId || null,
    shouldHighlight: event.type === 'pointerup',
    applied: false,
  }
  stage.classList.add('reorder-releasing')
  queueMicrotask(applyFlip)
}

const ensureObserver = () => {
  if (observer || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver(() => applyFlip())
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
