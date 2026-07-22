import { useLayoutEffect, useRef, useState } from 'react'

export default function OverflowText({ children, className = '', title }) {
  const windowRef = useRef(null)
  const textRef = useRef(null)
  const [overflow, setOverflow] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      const viewport = windowRef.current
      const text = textRef.current
      setOverflow(viewport && text ? Math.max(0, Math.ceil(text.scrollWidth - viewport.clientWidth)) : 0)
    }
    measure()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (observer) {
      if (windowRef.current) observer.observe(windowRef.current)
      if (textRef.current) observer.observe(textRef.current)
    }
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [children])

  return <span ref={windowRef} className={`overflow-stream-window${className ? ` ${className}` : ''}`} title={title}>
    <span ref={textRef} className={`overflow-stream-text${overflow > 1 ? ' is-overflowing' : ''}`} style={overflow > 1 ? { '--stream-distance': `-${overflow}px` } : undefined}>{children}</span>
  </span>
}
