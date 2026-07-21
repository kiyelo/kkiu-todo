import { useCallback, useRef } from 'react'

export default function useFastPress() {
  const suppressUntil = useRef(0)
  return useCallback((action) => ({
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse') return
      event.preventDefault(); event.stopPropagation()
      suppressUntil.current = performance.now() + 620
      action?.()
    },
    onClick: (event) => {
      if (performance.now() < suppressUntil.current) { event.preventDefault(); event.stopPropagation(); return }
      action?.()
    },
  }), [])
}
