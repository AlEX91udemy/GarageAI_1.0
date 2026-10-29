import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { ConnectionNotice } from './components/ConnectionNotice';
import { LandingPage } from './LandingPage';
import { LegalPage, type LegalKind } from './LegalPage';

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
const legalKinds: Record<string, LegalKind> = { '/privacy': 'privacy', '/privacy-policy': 'privacy', '/terms': 'terms', '/terms-of-use': 'terms', '/cookies': 'cookies', '/cookie-policy': 'cookies' };
const legalKind = typeof window !== 'undefined' ? legalKinds[window.location.pathname] : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAppRoute ? (
      <ErrorBoundary name="Garage AI">
        <ConnectionNotice />
        <App />
      </ErrorBoundary>
    ) : legalKind ? <LegalPage kind={legalKind} /> : <LandingPage />}
  </StrictMode>,
);


