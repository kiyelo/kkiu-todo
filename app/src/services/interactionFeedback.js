let enabled = true

export function setInteractionFeedbackEnabled(next) {
  enabled = next !== false
}

export function interactionFeedback(pattern) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  return navigator.vibrate(pattern)
}
