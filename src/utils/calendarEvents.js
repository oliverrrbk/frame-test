// Atomisk mutation af firmaets kalender-events via Postgres-RPC.
//
// Erstatter direkte skrivning til carpenter-rækken (som RLS blokerede for menige
// medarbejdere, og som tabte samtidige skrivninger). RPC'en autoriserer at kalderen
// hører til firmaet og fjerner + tilføjer events i én sætning.
import { supabase } from '../supabaseClient';

/**
 * @param {Object} opts
 * @param {string|number} opts.companyId  Firma-ejerens carpenter-id (hvor events ligger).
 * @param {string[]}      [opts.removeIds] Event-id'er der skal fjernes (til edit/slet).
 * @param {Object[]}      [opts.add]       Events der skal tilføjes.
 * @returns {Promise<Object[]>} Det opdaterede calendar_events-array.
 */
export async function mutateCalendarEvents({ companyId, removeIds = [], add = [] }) {
    const { data, error } = await supabase.rpc('mutate_calendar_events', {
        p_company_id: String(companyId),
        p_remove_ids: removeIds,
        p_add: add
    });
    if (error) throw error;
    return data || [];
}
