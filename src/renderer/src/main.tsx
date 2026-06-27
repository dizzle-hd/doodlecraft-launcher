import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Theme-Store früh importieren, damit data-theme vor dem ersten Render gesetzt ist.
import './store/theme'
import './styles/global.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
