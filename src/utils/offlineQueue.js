// Offline-kø til tidsstempling.
//
// Tømrere arbejder ofte uden signal (kældre, nybyg). Hvis en tjek-ind/ud fejler
// pga. manglende net, gemmer vi handlingen lokalt i stedet for at tabe den, og
// sender den automatisk når der igen er forbindelse. Operationerne afspilles i
// rækkefølge (FIFO), så en tjek-ind altid synkroniseres før dens tjek-ud.
import { mutateTimeEntries } from './timeEntries';

const KEY = 'bf_offline_time_ops';

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
}

// Læg en time_entry-operation i køen (samme felter som mutateTimeEntries).
export function queueTimeEntryOp(op) {
    const list = readQueue();
    list.push({ table: op.table, id: String(op.id), removeIds: op.removeIds || [], add: op.add || [], queuedAt: Date.now() });
    writeQueue(list);
}

export function queuedOpsCount() {
    return readQueue().length;
}

// Alle ventende registreringer i køen (til optimistisk visning i timesedlen), så
// svenden SER sine offline-gemte timer og ikke taster dem ind igen (= dubletter).
// Håndterer edit-i-kø (et add der senere fjernes igen vises ikke). Hver post får
// _table (leads/carpenters) og _opId (lead-id ved projekt-tid) med til opslag.
export function getQueuedEntries() {
    const list = readQueue();
    const byId = new Map();
    for (const op of list) {
        for (const id of (op.removeIds || [])) byId.delete(id);
        for (const e of (op.add || [])) {
            byId.set(e.id, { ...e, _table: op.table, _opId: op.id });
        }
    }
    return Array.from(byId.values());
}

// Udled den netto "åbne" tjek-ind fra køen — bruges til optimistisk visning, så
// svenden ser at han er tjekket ind, selv mens stemplingen venter på at blive sendt.
// Overlever reload, fordi den læses fra localStorage-køen (ikke React-state).
export function getQueuedOpenEntry() {
    const list = readQueue();
    let open = null;
    for (const op of list) {
        const removed = new Set(op.removeIds || []);
        if (open && removed.has(open.id)) open = null;
        for (const e of (op.add || [])) {
            if (e.endTime === null || e.endTime === undefined) {
                open = { ...e, leadId: op.id };
            } else if (open && e.id === open.id) {
                open = null;
            }
        }
    }
    return open;
}

// Afspil køen i rækkefølge. Stopper ved første fejl (stadig offline) og beholder
// resten, så intet går tabt. Returnerer hvor mange der blev sendt + hvor mange er tilbage.
let flushing = false;
export async function flushTimeEntryQueue() {
    if (flushing) return { flushed: 0, remaining: queuedOpsCount() };
    flushing = true;
    let list = readQueue();
    let flushed = 0;
    try {
        while (list.length > 0) {
            const op = list[0];
            try {
                await mutateTimeEntries({ table: op.table, id: op.id, removeIds: op.removeIds, add: op.add });
                list = list.slice(1);
                writeQueue(list);
                flushed++;
            } catch {
                break; // stadig offline / fejler — behold resten urørt
            }
        }
    } finally {
        flushing = false;
    }
    return { flushed, remaining: list.length };
}
