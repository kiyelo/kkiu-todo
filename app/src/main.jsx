import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeNativeAuth } from './services/nativeAuth.js'
import { restoreInitialSession } from './services/supabaseClient.js'
import './styles/index.css'
import './interactions/reorderHighlight.js'

await initializeNativeAuth()
await restoreInitialSession()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
