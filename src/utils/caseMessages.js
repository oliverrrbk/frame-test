// Sags-beskeder: dagens huske-ting fra mester/projektleder til hele holdet eller en
// bestemt person. Gemmes i raw_data.case_messages på sagen. "Set"-status holdes lokalt
// (dag-scoped i localStorage), da beskeder kun lever i dag — det undgår ekstra DB-skriv
// fra modtagerne og virker uden videre på tværs af roller.
import { supabase } from '../supabaseClient';

const todayStr = () => new Date().toISOString().substring(0, 10);

function sameDay(iso) {
    if (!iso) return false;
    try { return new Date(iso).toDateString() === new Date().toDateString(); }
    catch { return false; }
}

// Atomisk tilføj/fjern beskeder på en sag.
export async function mutateCaseMessages({ leadId, removeIds = [], add = [] }) {
    const { data, error } = await supabase.rpc('mutate_case_messages', {
        p_lead_id: String(leadId),
        p_remove_ids: removeIds,
        p_add: add
    });
    if (error) throw error;
    return data || [];
}

// Byg et besked-objekt klar til at sende.
export function buildCaseMessage({ text, forId, author }) {
    return {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: String(text || '').trim(),
        date: new Date().toISOString(),
        forId: forId || null,                 // null = hele holdet, ellers modtagerens id
        authorName: author?.name || 'Ukendt',
        authorRole: author?.role || null
    };
}

// Alle dagens beskeder der er relevante for en given bruger, på tværs af hans sager.
// (leadsData er allerede filtreret til de sager brugeren er på.)
export function getTodaysMessagesForUser(leadsData, userId) {
    const out = [];
    (leadsData || []).forEach(lead => {
        const title = lead.case_number ? `Sag ${lead.case_number}` : (lead.raw_data?.project_title || lead.project_category || 'Sag');

        (lead.raw_data?.case_messages || []).forEach(m => {
            if (!sameDay(m.date)) return;
            if (m.forId && String(m.forId) !== String(userId)) return; // målrettet en anden
            out.push({ ...m, leadId: lead.id, leadTitle: title });
        });

        // Bagudkompatibilitet: gammel enkelt-besked vises som "hele holdet".
        const legacy = lead.raw_data?.daily_message;
        if (legacy?.text && sameDay(legacy.date)) {
            out.push({
                id: `daily-${lead.id}`,
                text: legacy.text,
                date: legacy.date,
                forId: null,
                authorName: legacy.author || 'Ukendt',
                authorRole: null,
                leadId: lead.id,
                leadTitle: title
            });
        }
    });
    return out.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// --- "Set"-status (lokalt, nulstilles automatisk hver dag) ---
const SEEN_KEY = 'bf_seen_case_msgs';

export function getSeenSet() {
    try {
        const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
        if (raw.date !== todayStr()) return new Set();
        return new Set(raw.ids || []);
    } catch { return new Set(); }
}

export function markSeen(ids) {
    try {
        const set = getSeenSet();
        ids.forEach(id => set.add(id));
        localStorage.setItem(SEEN_KEY, JSON.stringify({ date: todayStr(), ids: [...set] }));
    } catch { /* ignore */ }
}

export function countUnseen(messages, seenSet) {
    return (messages || []).filter(m => !seenSet.has(m.id)).length;
}
