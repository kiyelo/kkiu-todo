import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const designMode = new URLSearchParams(window.location.search).get('design')

if (designMode !== 'original') {
  await import('./hig-overrides.css')
  const { installHigEnhancements } = await import('./higEnhancements.js')
  installHigEnhancements()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
