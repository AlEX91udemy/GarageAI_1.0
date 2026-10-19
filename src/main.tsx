import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { ConnectionNotice } from './components/ConnectionNotice';

// Keep the error boundary visible for real application failures. Only suppress the
// browser's known ResizeObserver loop notification.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = (event?.message || event?.error?.message || '').toString();
    if (msg.includes('ResizeObserver loop')) {
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event?.reason?.message || event?.reason || '').toString();
    if (reason.includes('ResizeObserver loop')) {
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="GarageHub">
      <ConnectionNotice />
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


