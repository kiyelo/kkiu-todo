import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = 'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

function isVisible(element) {
  return element.getClientRects().length > 0
}

function isTopmostDialog(dialog) {
  const openDialogs = [...document.querySelectorAll('[aria-modal="true"]')].filter(isVisible)
  return openDialogs.at(-1) === dialog
}

export default function useDialogA11y(onClose) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    const previousFocus = document.activeElement
    const focusFirst = () => {
      if (!isTopmostDialog(dialog)) return
      const focusTarget = dialog.querySelector(FOCUSABLE_SELECTOR) || dialog
      focusTarget.focus()
    }
    const focusFrame = requestAnimationFrame(focusFirst)

    const handleKeyDown = (event) => {
      if (!isTopmostDialog(dialog)) return

      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible)
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        requestAnimationFrame(() => previousFocus.focus())
      }
    }
  }, [])

  return dialogRef
}
