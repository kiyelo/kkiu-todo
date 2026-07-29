const UNDO_SELECTOR = '.app-toast.undo-toast'

function enhanceUndoToast(toast) {
  if (!(toast instanceof HTMLElement)) return

  toast.setAttribute('aria-live', 'polite')
  toast.setAttribute('aria-atomic', 'true')

  const previousTrack = toast.querySelector('.undo-countdown-track')
  previousTrack?.remove()

  const track = document.createElement('span')
  track.className = 'undo-countdown-track'
  track.setAttribute('aria-hidden', 'true')

  const fill = document.createElement('i')
  fill.className = 'undo-countdown-fill'
  track.appendChild(fill)
  toast.appendChild(track)
}

export function installHigEnhancements() {
  const root = document.getElementById('root')
  if (!root) return () => {}

  let lastUndoText = ''
  const sync = () => {
    const toast = root.querySelector(UNDO_SELECTOR)
    if (!toast) {
      lastUndoText = ''
      return
    }

    const currentText = toast.textContent?.trim() || ''
    const hasTrack = Boolean(toast.querySelector('.undo-countdown-track'))
    if (!hasTrack || currentText !== lastUndoText) {
      enhanceUndoToast(toast)
      lastUndoText = currentText
    }
  }

  sync()
  const observer = new MutationObserver(sync)
  observer.observe(root, { childList: true, subtree: true, characterData: true })
  return () => observer.disconnect()
}
