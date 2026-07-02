// ============================================================================
// coachmarks.js — "set én gang"-styring for kom-i-gang-bobler og rundture.
// Additivt: rører ingen eksisterende data eller design.
// ============================================================================
// To lag:
//   1) localStorage — hurtig, synkron cache så shouldShowCoach() kan læses under
//      render og virker offline.
//   2) Database (carpenters.raw_data) — kilden til sandhed PER BRUGER, så en
//      boble man har set forbliver set på tværs af browsere og enheder.
//
// localStorage-nøgler (uændret konvention):
//   bison_coach_seen    = JSON-map { nøgle: true } over bobler man har set
//   bison_coach_skipped = 'true' når brugeren har trykket "Spring guiden over"
//
// DB-felter (på brugerens egen carpenters-række, i raw_data):
//   coachmarks_seen     = samme map
//   coachmarks_skipped  = bool
// ============================================================================

import { supabase } from '../../supabaseClient';

const SEEN_KEY = 'bison_coach_seen';
const SKIP_KEY = 'bison_coach_skipped';

// Profil-id der skrives til i DB'en (sat ved hydrering efter login). Null =
// ingen DB-synk endnu (falder tilbage til ren localStorage-adfærd).
let _syncProfileId = null;

const readLocalSeen = () => {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; }
};

// Coachmarks vises KUN på computer (samme 768px-grænse som resten af appen).
export const isCoachDesktop = () =>
    typeof window !== 'undefined' && window.innerWidth > 768;

export const coachSkipped = () => {
    try { return localStorage.getItem(SKIP_KEY) === 'true'; } catch { return false; }
};

// Best-effort skrivning til brugerens egen carpenters-række. Fletter ind i
// eksisterende raw_data så intet andet overskrives. Fejl ignoreres bevidst —
// localStorage er stadig autoritativ i denne browser.
const persistToDb = async (seenMap, skipped) => {
    if (!_syncProfileId) return;
    try {
        const { data } = await supabase.from('carpenters').select('raw_data').eq('id', _syncProfileId).single();
        const merged = { ...(data?.raw_data || {}), coachmarks_seen: seenMap, coachmarks_skipped: skipped };
        await supabase.from('carpenters').update({ raw_data: merged }).eq('id', _syncProfileId);
    } catch { /* ignore */ }
};

// Kald ved login med brugerens EGEN profil. Fletter DB-status ned i localStorage
// (union: set ét sted = set), så shouldShowCoach virker med det samme, og
// backfiller DB med evt. lokalt-kun status, så intet går tabt ved overgangen.
export const hydrateCoachFromProfile = (profile) => {
    if (!profile?.id) return;
    _syncProfileId = profile.id;
    try {
        const dbSeen = profile.raw_data?.coachmarks_seen || {};
        const dbSkipped = profile.raw_data?.coachmarks_skipped === true;

        const localSeen = readLocalSeen();
        const localSkipped = coachSkipped();

        const mergedSeen = { ...localSeen, ...dbSeen };
        const mergedSkipped = dbSkipped || localSkipped;

        localStorage.setItem(SEEN_KEY, JSON.stringify(mergedSeen));
        if (mergedSkipped) localStorage.setItem(SKIP_KEY, 'true');

        // Backfill DB kun hvis lokalt havde noget DB manglede (fx eksisterende
        // brugere fra før DB-synk fandtes). Fire-and-forget.
        const seenChanged = JSON.stringify(mergedSeen) !== JSON.stringify(dbSeen);
        if (seenChanged || mergedSkipped !== dbSkipped) {
            persistToDb(mergedSeen, mergedSkipped);
        }
    } catch { /* ignore */ }
};

// Slår ALLE fremtidige coachmarks fra på én gang.
export const skipAllCoach = () => {
    try { localStorage.setItem(SKIP_KEY, 'true'); } catch { /* ignore */ }
    persistToDb(readLocalSeen(), true);
};

// Har brugeren set denne boble før (eller sprunget alt over)?
export const coachSeen = (key) => {
    try {
        if (coachSkipped()) return true;
        const map = readLocalSeen();
        return !!map[key];
    } catch { return false; }
};

// Markér en boble som set (så den aldrig vises igen). Skriver lokalt (synkront)
// og til DB'en i baggrunden, så det følger med til andre browsere/enheder.
export const markCoachSeen = (key) => {
    let map = {};
    try {
        map = readLocalSeen();
        map[key] = true;
        localStorage.setItem(SEEN_KEY, JSON.stringify(map));
    } catch { /* ignore */ }
    persistToDb(map, coachSkipped());
};

// Skal denne boble vises nu? (desktop + ikke set + ikke sprunget over)
export const shouldShowCoach = (key) => isCoachDesktop() && !coachSeen(key);

// Nulstil ALLE guides: rydder "set", "sprunget over" og gemt onboarding-fremdrift,
// så alle rundture kan køres forfra (efter et reload). Rydder både localStorage
// OG DB'en, så genstarten også slår igennem på tværs af browsere.
export const resetCoach = () => {
    try {
        localStorage.removeItem(SEEN_KEY);
        localStorage.removeItem(SKIP_KEY);
        Object.keys(localStorage)
            .filter(k => k.startsWith('bison_onboarding_progress'))
            .forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    persistToDb({}, false);
};
