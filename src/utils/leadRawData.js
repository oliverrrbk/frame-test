// Atomisk shallow-merge af leads.raw_data via mutate_lead_raw_data-RPC'en.
//
// Erstatter klientens "læs hele raw_data -> spread i JS -> skriv hele bloben",
// som kunne overskrive samtidige ændringer af ANDRE nøgler (lost update). RPC'en
// fletter kun de ændrede top-level-nøgler ind mod den levende række.
//
// ROBUST DEPLOY: hvis RPC'en endnu ikke er oprettet i databasen (setup_lead_raw_data_rpc.sql
// ikke kørt), falder vi automatisk tilbage til den gamle read-modify-write, så
// gem ALDRIG fejler pga. deploy-rækkefølge. Når RPC'en findes, bruges den.
import { supabase } from '../supabaseClient';

function isMissingFunction(error) {
    const msg = (error?.message || '').toLowerCase();
    return error?.code === 'PGRST202'
        || msg.includes('could not find the function')
        || msg.includes('does not exist');
}

/**
 * @param {string|number} id      leads.id
 * @param {Object}        patch   Top-level raw_data-nøgler der skal flettes ind.
 * @returns {Promise<Object>}     Den opdaterede (komplette) raw_data.
 */
export async function mutateLeadRawData(id, patch) {
    const { data, error } = await supabase.rpc('mutate_lead_raw_data', {
        p_id: id,
        p_patch: patch
    });

    if (error && isMissingFunction(error)) {
        // Fallback: RPC ikke deployet endnu -> gammel read-modify-write.
        const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', id).single();
        const merged = { ...(latest?.raw_data || {}), ...patch };
        const { error: upErr } = await supabase.from('leads').update({ raw_data: merged }).eq('id', id);
        if (upErr) throw upErr;
        return merged;
    }

    if (error) throw error;
    return data || null;
}
