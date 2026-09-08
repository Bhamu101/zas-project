import './index.css'
import { StrictMode } from 'react'

import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import LoginGate from './components/auth/LoginGate.jsx'

// HashRouter, not BrowserRouter: this app is also packaged with Electron, which
// loads dist/index.html over file:// in production. History-API routes break
// there, and on any static host without rewrite rules. Hash routes work in both
// and still give real URLs, deep links and a working back button.
//
// LoginGate wraps App rather than living inside it, so useDashboardData never
// runs (and never 401s) before there is a session to authenticate with.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LoginGate>
      <HashRouter>
        <App />
      </HashRouter>
    </LoginGate>
  </StrictMode>,
)
