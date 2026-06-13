// Er appen åbnet som installeret webapp (PWA i standalone-tilstand)?
// Bruges til at sende installerede brugere direkte til login/dashboard
// i stedet for marketing-forsiden.
export function isStandalonePWA() {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
        window.navigator?.standalone === true // iOS Safari hjemmeskærms-app
    );
}
