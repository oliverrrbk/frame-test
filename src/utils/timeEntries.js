// Atomisk mutation af time_entries via Postgres-RPC.
//
// Erstatter klientens "read-modify-write" (læs raw_data -> rediger i JS -> skriv
// hele arrayet tilbage), som tabte registreringer når flere skrev samtidigt på
// samme sag/profil. RPC'en fjerner + tilføjer i én SQL-sætning, så samtidige
// skrivninger serialiseres på rækkelåsen.
import { supabase } from '../supabaseClient';

/**
 * @param {Object}   opts
 * @param {'leads'|'carpenters'} opts.table  Tabellen hvor time_entries ligger.
 * @param {string|number}        opts.id     Række-id (sag eller medarbejder).
 * @param {string[]}             [opts.removeIds]  Id'er på registreringer der skal fjernes (til edit/slet).
 * @param {Object[]}             [opts.add]        Nye registreringer der skal tilføjes.
 * @returns {Promise<Object[]>}  Det opdaterede time_entries-array.
 */
export async function mutateTimeEntries({ table, id, removeIds = [], add = [] }) {
    const { data, error } = await supabase.rpc('mutate_time_entries', {
        p_table: table,
        p_id: String(id),
        p_remove_ids: removeIds,
        p_add: add
    });
    if (error) throw error;
    return data || [];
}
