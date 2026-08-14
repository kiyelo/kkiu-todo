let pending = null
let observer = null
let rafA = 0
let rafB = 0

const cancelQueueSettle = (stage) => {
  if (!stage) return
  stage.dispatchEvent(new Event('wheel'))
}

const findRow = (id) => {
  if (!id) return null
  return [...document.querySelectorAll('.queue-task-row[data-task-id]')].find((row) => row.dataset.taskId === id) || null
}

const stabilize = () => {
  if (!pending) return
  const { stage, scroller, id, top } = pending
  if (!stage?.isConnected || !scroller?.isConnected) { pending = null; return }
  const row = findRow(id)
  if (!row) return
  const delta = row.getBoundingClientRect().top - top
  if (Math.abs(delta) > 0.5) {
    scroller.scrollTop += delta
    const track = stage.querySelector('.qtrack')
    if (track) track.style.transform = `translate3d(0,${-scroller.scrollTop}px,0)`
  }
  cancelQueueSettle(stage)
}

const finishStabilizing = () => {
  if (!pending) return
  stabilize()
  pending.stage?.classList.remove('reorder-releasing')
  pending = null
}

const scheduleStabilizing = () => {
  queueMicrotask(stabilize)
  cancelAnimationFrame(rafA)
  cancelAnimationFrame(rafB)
  rafA = requestAnimationFrame(() => {
    stabilize()
    rafB = requestAnimationFrame(finishStabilizing)
  })
}

const onPointerEnd = () => {
  const stage = document.querySelector('.stage.q.reordering')
  if (!stage) return
  const row = stage.querySelector('.queue-task-row.reorder-dragging[data-task-id]')
  const scroller = stage.querySelector('.qvp')
  if (!row || !scroller) return
  pending = { stage, scroller, id: row.dataset.taskId, top: row.getBoundingClientRect().top }
  stage.classList.add('reorder-releasing')
  cancelQueueSettle(stage)
  scheduleStabilizing()
}

const ensureObserver = () => {
  if (observer || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver(() => {
    if (!pending) return
    if (!pending.stage.classList.contains('reordering')) scheduleStabilizing()
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', onPointerEnd, true)
  window.addEventListener('pointercancel', onPointerEnd, true)
  ensureObserver()
}
