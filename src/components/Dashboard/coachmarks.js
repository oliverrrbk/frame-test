// ============================================================================
// coachmarks.js — letvægts "set én gang"-styring for kom-i-gang-bobler.
// Additivt: rører ingen eksisterende data eller design. Kun localStorage.
// ============================================================================
// Konvention som resten af appen (jf. bison_pwa_onboarding_seen):
//   bison_coach_seen    = JSON-map { nøgle: true } over bobler man har set
//   bison_coach_skipped = 'true' når brugeren har trykket "Spring guiden over"
// ============================================================================

const SEEN_KEY = 'bison_coach_seen';
const SKIP_KEY = 'bison_coach_skipped';

// Coachmarks vises KUN på computer (samme 768px-grænse som resten af appen).
export const isCoachDesktop = () =>
    typeof window !== 'undefined' && window.innerWidth > 768;

export const coachSkipped = () => {
    try { return localStorage.getItem(SKIP_KEY) === 'true'; } catch { return false; }
};

// Slår ALLE fremtidige coachmarks fra på én gang.
export const skipAllCoach = () => {
    try { localStorage.setItem(SKIP_KEY, 'true'); } catch { /* ignore */ }
};

// Har brugeren set denne boble før (eller sprunget alt over)?
export const coachSeen = (key) => {
    try {
        if (coachSkipped()) return true;
        const map = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
        return !!map[key];
    } catch { return false; }
};

// Markér en boble som set (så den aldrig vises igen).
export const markCoachSeen = (key) => {
    try {
        const map = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
        map[key] = true;
        localStorage.setItem(SEEN_KEY, JSON.stringify(map));
    } catch { /* ignore */ }
};

// Skal denne boble vises nu? (desktop + ikke set + ikke sprunget over)
export const shouldShowCoach = (key) => isCoachDesktop() && !coachSeen(key);
