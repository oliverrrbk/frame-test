// Offline-først læse-cache (IndexedDB).
//
// Baggrund: app-skallen caches allerede af service workeren (public/sw.js), så
// selve appen kan åbne uden net. Men SELVE DATAENE (sager, materialer, profil)
// hentes hver gang fra Supabase — så uden signal hang appen på "Indlæser
// arbejdsområdet…" for evigt.
//
// Denne cache gemmer sidst hentede data lokalt, så tømreren straks ser sine
// nuværende sager UDEN net. Friske data hentes bagefter og overskriver, når der
// er forbindelse (stale-while-revalidate på data-laget).
//
// Hvorfor IndexedDB og ikke localStorage: sager rummer stor `raw_data` (chat,
// beskeder, tilbudslinjer). localStorage's ~5 MB-loft er for lidt; IndexedDB er
// asynkront og rummer langt mere. Køen til skrivninger (offlineQueue.js /
// mutationQueue.js) bruger fortsat localStorage, da den er lille.

const DB_NAME = 'bison_frame_cache';
const STORE = 'kv';
const VERSION = 1;

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        try {
            if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB utilgængelig')); return; }
            const req = indexedDB.open(DB_NAME, VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
    return dbPromise;
}

// Læs en værdi. Returnerer null ved manglende nøgle eller fejl (best-effort).
export async function cacheGet(key) {
    try {
        const db = await openDb();
        return await new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

// Gem en værdi. Fejler stille — cachen er en bonus, aldrig en blokering.
export async function cacheSet(key, value) {
    try {
        const db = await openDb();
        await new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        });
    } catch {
        /* best-effort */
    }
}

// Slet en værdi (fx ved log-ud, så næste bruger ikke ser gamle sager).
export async function cacheDelete(key) {
    try {
        const db = await openDb();
        await new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch {
        /* best-effort */
    }
}
