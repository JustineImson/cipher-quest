import './phaser-global.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { ErrorBoundary } from './components/ErrorBoundary'
import { logApp } from './services/logService'
import { auth } from './services/firebase'

registerSW({ immediate: true })

// Catch uncaught errors outside of React
window.onerror = function (message, source, lineno, colno, error) {
  const uid = auth?.currentUser?.uid || null;
  logApp.error('UNCAUGHT_EXCEPTION', { 
    message: message?.toString(), 
    source, lineno, colno, 
    stack: error?.stack?.slice(0, 500) 
  }, uid);
};

window.onunhandledrejection = function (event) {
  const uid = auth?.currentUser?.uid || null;
  logApp.error('UNHANDLED_PROMISE_REJECTION', { 
    reason: event.reason?.message || event.reason?.toString(),
    stack: event.reason?.stack?.slice(0, 500)
  }, uid);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
