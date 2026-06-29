// Tilbuds-skabeloner til feltet "Arbejdsbeskrivelse" i Hurtigt tilbud.
// CRUD mod Supabase-tabellen `quote_templates` (se setup_quote_templates.sql).
// Skabeloner deles pr. FIRMA, så hele teamet bruger de samme.
import { supabase } from '../supabaseClient';

// Firma-roden som skabeloner gemmes under: et team-medlems company_id peger på
// mesterens id; mesteren selv har intet company_id og bruger sit eget id.
export const templateOwnerId = (carpenter) =>
    carpenter?.company_id || carpenter?.id || null;

// Hent firmaets skabeloner (nyeste først). Fejler aldrig hårdt — returnerer [].
export async function listQuoteTemplates(carpenter) {
    const ownerId = templateOwnerId(carpenter);
    if (!ownerId) return [];
    const { data, error } = await supabase
        .from('quote_templates')
        .select('id, name, body_html, created_at, updated_at')
        .eq('carpenter_id', ownerId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Kunne ikke hente skabeloner:', error.message);
        return [];
    }
    return data || [];
}

// Opret en ny skabelon. Returnerer den oprettede række.
export async function createQuoteTemplate(carpenter, { name, bodyHtml }) {
    const ownerId = templateOwnerId(carpenter);
    if (!ownerId) throw new Error('Mangler firma-id til skabelon.');
    const { data, error } = await supabase
        .from('quote_templates')
        .insert([{
            carpenter_id: ownerId,
            created_by: carpenter?.id || null,
            name: (name || '').trim() || 'Uden navn',
            body_html: bodyHtml || '',
        }])
        .select('id, name, body_html, created_at, updated_at')
        .single();
    if (error) throw error;
    return data;
}

// Ret en eksisterende skabelon (navn og/eller indhold).
export async function updateQuoteTemplate(id, { name, bodyHtml }) {
    const patch = {};
    if (name != null) patch.name = (name || '').trim() || 'Uden navn';
    if (bodyHtml != null) patch.body_html = bodyHtml;
    const { data, error } = await supabase
        .from('quote_templates')
        .update(patch)
        .eq('id', id)
        .select('id, name, body_html, created_at, updated_at')
        .single();
    if (error) throw error;
    return data;
}

// Slet en skabelon.
export async function deleteQuoteTemplate(id) {
    const { error } = await supabase.from('quote_templates').delete().eq('id', id);
    if (error) throw error;
}
