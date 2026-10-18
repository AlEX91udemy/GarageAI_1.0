import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { ConnectionNotice } from './components/ConnectionNotice';

// Global error shield to prevent unhandled script crashes in embedded environments
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = (event?.message || event?.error?.message || '').toString();
    if (
      msg.includes('is not a function') ||
      msg.includes('Script error') ||
      msg.includes('ResizeObserver')
    ) {
      console.warn('[GlobalErrorShield] Handled error:', msg);
      try { event.stopImmediatePropagation(); } catch (_) {}
      try { event.preventDefault(); } catch (_) {}
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event?.reason?.message || event?.reason || '').toString();
    if (reason.includes('is not a function') || reason.includes('ResizeObserver')) {
      console.warn('[GlobalErrorShield] Handled unhandled rejection:', reason);
      try { event.stopImmediatePropagation(); } catch (_) {}
      try { event.preventDefault(); } catch (_) {}
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


