// Hjælpere til "Få Frame som app"-flowet.
// Browserens `beforeinstallprompt` fanges allerede i index.html (det fyrer ofte før
// React er mountet) og lægges på window.__bisonInstallPrompt. Her udstiller vi det
// til React + en lille pub/sub, så knapper kan vise/skjule sig når muligheden ændrer sig.
import { isStandalonePWA } from './pwa';

const listeners = new Set();

if (typeof window !== 'undefined') {
    window.addEventListener('bison-install-available', () => listeners.forEach((fn) => fn()));
    window.addEventListener('bison-install-done', () => listeners.forEach((fn) => fn()));
}

// Kan browseren tilbyde ét-tryks-installation netop nu? (Chrome/Edge på Android + desktop)
export function canInstallNatively() {
    return typeof window !== 'undefined' && !!window.__bisonInstallPrompt;
}

// Vis browserens native installations-dialog. Returnerer true hvis brugeren accepterede.
export async function promptNativeInstall() {
    const evt = typeof window !== 'undefined' ? window.__bisonInstallPrompt : null;
    if (!evt) return false;
    try {
        evt.prompt();
        const choice = await evt.userChoice;
        if (choice?.outcome === 'accepted') {
            window.__bisonInstallPrompt = null;
            listeners.forEach((fn) => fn());
            return true;
        }
    } catch { /* dialog kan kun vises én gang pr. event — ignorér */ }
    return false;
}

// Abonnér på ændringer i install-muligheden (event blev tilgængeligt / app blev installeret).
export function onInstallAvailabilityChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export { isStandalonePWA };
