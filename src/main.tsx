import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { ConnectionNotice } from './components/ConnectionNotice';
import type { LegalKind } from './LegalPage';

// Each public route has a separate entry chunk. A visitor to the landing or a
// legal page should not download the authenticated garage application upfront.
const App = lazy(() => import('./App.tsx'));
const LandingPage = lazy(() => import('./LandingPage').then(({ LandingPage }) => ({ default: LandingPage })));
const LegalPage = lazy(() => import('./LegalPage').then(({ LegalPage }) => ({ default: LegalPage })));

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
    <Suspense fallback={<main className="min-h-screen bg-neutral-100" aria-busy="true" />}>
      {isAppRoute ? (
      <ErrorBoundary name="Garage AI">
        <ConnectionNotice />
        <App />
      </ErrorBoundary>
      ) : legalKind ? <LegalPage kind={legalKind} /> : <LandingPage />}
    </Suspense>
  </StrictMode>,
);


