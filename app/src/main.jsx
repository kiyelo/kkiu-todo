import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeNativeAuth } from './services/nativeAuth.js'
import './styles/index.css'
import './interactions/reorderHighlight.js'

await initializeNativeAuth()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
