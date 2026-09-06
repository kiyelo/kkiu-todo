import { Suspense, lazy } from 'react'

const LazyMoreScreen = lazy(() => import('./MoreScreenImpl.jsx'))

export default function MoreScreen(props) {
  return (
    <Suspense fallback={<div className="stage q more-queue-stage" aria-busy="true" />}>
      <LazyMoreScreen {...props} />
    </Suspense>
  )
}
