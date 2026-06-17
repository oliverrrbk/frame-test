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
