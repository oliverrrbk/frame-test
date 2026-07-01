import { lazy } from 'react';

// Robust lazy-loading mod "Failed to fetch dynamically imported module".
//
// Hvorfor: Vite giver hver kode-bid et hash-navn (fx AdminTimesheet-D3Da6XJX.js).
// Når vi deployer, skifter hashet. En fane der stadig har den GAMLE index.html åben
// (svenden lod appen stå åben) peger på et filnavn der ikke længere findes på serveren
// -> browseren kaster "Failed to fetch dynamically imported module" og dashboardet crasher.
//
// Løsning: fang netop den fejl og lav ÉT automatisk reload. Vores service worker er
// network-first på navigation, så et reload henter frisk index.html med de nye hash-navne,
// og siden virker igen. Guarden sikrer at en ægte manglende chunk (reel bug) ikke ender
// i en uendelig reload-løkke.

const CHUNK_ERROR_RE =
  /(Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module|Unable to preload)/i;

export function isChunkLoadError(err) {
  const msg = err?.message || err?.reason?.message || String(err || '');
  return CHUNK_ERROR_RE.test(msg);
}

const RELOAD_KEY = 'frame:chunk-reload-at';
const RELOAD_WINDOW_MS = 15000;

// Reloader højst én gang inden for et kort vindue. Returnerer true hvis et reload
// blev udløst (så kalderen kan lade være med at rendre noget imens).
export function reloadForFreshChunks() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    const now = Date.now();
    if (now - last < RELOAD_WINDOW_MS) return false; // allerede prøvet lige før -> undgå løkke
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // sessionStorage kan være blokeret (privat browsing) — reload alligevel én gang.
  }
  window.location.reload();
  return true;
}

// Drop-in erstatning for React.lazy() der self-healer efter et deploy.
export function lazyWithReload(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isChunkLoadError(err) && reloadForFreshChunks()) {
        // Returnér en promise der aldrig resolver, så Suspense-fallbacken bliver stående
        // indtil reloadet rammer — brugeren ser aldrig crash-skærmen.
        return await new Promise(() => {});
      }
      throw err;
    }
  });
}
