import { Suspense, lazy } from 'react'

let moreScreenModulePromise = null

export function preloadMoreScreen() {
  if (!moreScreenModulePromise) moreScreenModulePromise = import('./MoreScreenImpl.jsx')
  return moreScreenModulePromise
}

const LazyMoreScreen = lazy(() => preloadMoreScreen())

export default function MoreScreen(props) {
  return (
    <Suspense fallback={<div className="stage q more-queue-stage" aria-busy="true" />}>
      <LazyMoreScreen {...props} />
    </Suspense>
  )
}
