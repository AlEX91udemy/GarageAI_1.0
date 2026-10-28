import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { ConnectionNotice } from './components/ConnectionNotice';
import { LandingPage } from './LandingPage';

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

const isAppRoute = typeof window !== 'undefined' && (window.location.pathname === '/app' || window.location.pathname.startsWith('/app/'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAppRoute ? (
      <ErrorBoundary name="Garage AI">
        <ConnectionNotice />
        <App />
      </ErrorBoundary>
    ) : <LandingPage />}
  </StrictMode>,
);


