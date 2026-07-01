// Generisk offline-kø til skrivninger.
//
// Udvider idéen fra offlineQueue.js (som kun dækker tidsstempling) til andre
// handlinger, så tømreren kan arbejde videre uden net: handlingen gemmes lokalt
// og sendes automatisk, når der igen er forbindelse. Afspilles i rækkefølge
// (FIFO), så beskeder/ændringer lander i den rækkefølge de blev lavet.
//
// VIGTIGT om hvad der er sikkert at køe:
//   • Rene, additive DB-skrivninger (fx sags-beskeder via atomisk RPC) er sikre —
//     de fletter serverside og kan ikke tabe hinandens data.
//   • Handlinger med binære uploads (PDF'er til Storage) eller e-mail-afsendelse
//     køes IKKE her — de har sideeffekter der ikke kan afspilles sikkert. Dér
//     viser vi i stedet en klar "ingen forbindelse — prøv igen"-besked.
//
// Handlere registreres ved opstart (se App.jsx). En op uden registreret handler
// bliver liggende urørt i køen, indtil handleren findes (aldrig droppet).

const KEY = 'bf_offline_mutations';

const handlers = new Map();       // type -> async (payload) => void
const listeners = new Set();      // () => void, kaldes når køen ændrer sig

function readQueue() {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

function writeQueue(list) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Kunne ikke gemme offline-kø:', e);
    }
    listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

// Registrér hvordan en op-type afspilles mod serveren.
export function registerMutationHandler(type, fn) {
    handlers.set(type, fn);
}

// Læg en handling i køen. Returnerer op'ens id (til optimistisk visning).
export function enqueueMutation(type, payload) {
    const list = readQueue();
    const id = `mq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    list.push({ id, type, payload, queuedAt: Date.now() });
    writeQueue(list);
    return id;
}

export function queuedMutationCount() {
    return readQueue().length;
}

export function queuedMutations() {
    return readQueue();
}

// Abonnér på kø-ændringer (til fx et badge). Returnerer et unsubscribe-kald.
export function subscribeMutationQueue(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// Afspil køen i rækkefølge. Stopper ved første fejl (stadig offline) og beholder
// resten, så intet går tabt. Ops uden registreret handler springes over (bliver
// liggende). Returnerer hvor mange der blev sendt + hvor mange er tilbage.
let flushing = false;
export async function flushMutationQueue() {
    if (flushing) return { flushed: 0, remaining: queuedMutationCount() };
    flushing = true;
    let flushed = 0;
    try {
        let list = readQueue();
        let i = 0;
        while (i < list.length) {
            const op = list[i];
            const handler = handlers.get(op.type);
            if (!handler) { i++; continue; } // ingen handler endnu — lad den ligge
            try {
                await handler(op.payload);
                list = list.filter((o) => o.id !== op.id);
                writeQueue(list);
                flushed++;
                // start forfra efter et vellykket kald (listen kan være ændret)
                i = 0;
            } catch {
                break; // stadig offline / fejler — behold resten urørt
            }
        }
        return { flushed, remaining: list.length };
    } finally {
        flushing = false;
    }
}
