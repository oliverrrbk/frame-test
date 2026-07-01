import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installGlobalErrorLogging } from './utils/errorLogger';
import { reloadForFreshChunks } from './utils/lazyWithReload';

// Usynlig fejl-opsamling (fanger uventede fejl + afviste promises på alle enheder).
installGlobalErrorLogging();

// Vite fyrer 'vite:preloadError' når en modulepreload af en kode-bid fejler (typisk
// efter et deploy hvor de gamle hash-navne er væk). Self-heal med ét reload, så
// brugeren aldrig ser en crash. preventDefault stopper Vites default (kaster fejlen).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForFreshChunks();
});

// Service worker: KUN i produktion. I dev cacher den ellers stale JS-bundles
// (filerne er ikke hash-navngivne i dev), hvilket kan crashe appen ("React er null").
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  } else {
    // Dev: ryd op efter en evt. tidligere registreret service worker + dens caches,
    // så gamle bundles ikke serveres og crasher appen. Self-healer med ét auto-reload.
    navigator.serviceWorker.getRegistrations().then(regs => {
      const had = regs.length > 0;
      regs.forEach(reg => reg.unregister());
      if (window.caches?.keys) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
      }
      if (had && navigator.serviceWorker.controller && !sessionStorage.getItem('sw-dev-cleared')) {
        sessionStorage.setItem('sw-dev-cleared', '1');
        window.location.reload();
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')).render(
    <App />
)
