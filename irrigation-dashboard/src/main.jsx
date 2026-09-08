import './index.css'
import { StrictMode } from 'react'

import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import LoginGate from './components/auth/LoginGate.jsx'

// LoginGate wraps App rather than living inside it, so useDashboardData never
// runs (and never 401s) before there is a session to authenticate with.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LoginGate>
      <App />
    </LoginGate>
  </StrictMode>,
)
