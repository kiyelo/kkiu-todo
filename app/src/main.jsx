import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeNativeAuth } from './services/nativeAuth.js'
import { restoreStartupTabForExistingSession } from './services/startupTab.js'
import './styles.css'
import './queuePerformance.css'
import './composerNativeScroll.css'
import './reorderFix.css'
import './reorderDropFlip.js'

restoreStartupTabForExistingSession()
void initializeNativeAuth()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
