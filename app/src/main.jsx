import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { preloadMoreScreen } from './components/MoreScreen.jsx'
import { preloadSheets } from './components/Sheets.jsx'
import { initializeNativeAuth } from './services/nativeAuth.js'
import { markStartupAfterPaint, markStartupOnce } from './services/startupMetrics.js'
import './styles/index.css'
import './interactions/reorderHighlight.js'

markStartupOnce('js-entry')

// Start native auth/deep-link setup immediately, but do not block the first
// React paint on Capacitor bridge calls such as App.getLaunchUrl(). Normal cold
// starts can render the cached queue while auth restoration continues.
void initializeNativeAuth().catch((error) => {
  console.warn('[kkiu native auth bootstrap]', error)
})

const preloadDeferredUi = () => {
  const preload = () => {
    void Promise.allSettled([
      preloadSheets(),
      preloadMoreScreen(),
    ]).then(() => markStartupOnce('deferred-ui-preloaded'))
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preload)
      return
    }
    window.setTimeout(preload, 200)
  }))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
markStartupOnce('react-render-called')
markStartupAfterPaint('first-react-frame')
preloadDeferredUi()
