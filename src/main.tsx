import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors and unhandled rejections related to HMR
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      if (reason && (
        String(reason.message || reason).includes('WebSocket') || 
        String(reason.message || reason).includes('vite')
      )) {
        event.preventDefault();
        console.debug('Suppressed benign Vite HMR error:', reason);
      }
    } catch (e) {}
  });

  const originalError = console.error;
  console.error = (...args) => {
    try {
      const firstArg = args[0];
      if (typeof firstArg === 'string' && (
        firstArg.includes('[vite] failed to connect') || 
        firstArg.includes('WebSocket connection to')
      )) {
        return;
      }
    } catch (e) {}
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
