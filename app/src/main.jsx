import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeNativeAuth } from './services/nativeAuth.js'
import './styles/index.css'
import './styles/editMode.css'
import './interactions/reorderHighlight.js'

// Start native auth/deep-link setup immediately, but do not block the first
// React paint on Capacitor bridge calls such as App.getLaunchUrl(). Normal cold
// starts can render the cached queue while auth restoration continues.
void initializeNativeAuth().catch((error) => {
  console.warn('[kkiu native auth bootstrap]', error)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
