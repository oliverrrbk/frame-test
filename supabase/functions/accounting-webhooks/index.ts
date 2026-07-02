import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Håndter CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url);
        const source = url.searchParams.get('source') || 'unknown'; // f.eks. ?source=dinero

        // SIKKERHED: delt hemmelighed, så ikke hvem som helst kan markere fakturaer
        // som betalt på tværs af firmaer. OPT-IN for ikke at bryde den nuværende
        // auto-"betalt": kun HVIS ACCOUNTING_WEBHOOK_SECRET er sat i miljøet kræves
        // den. Sæt den + tilføj ?secret=... (eller header x-webhook-secret) på
        // webhook-URL'en hos Dinero/e-conomic for at låse endpointet helt.
        const expectedSecret = Deno.env.get('ACCOUNTING_WEBHOOK_SECRET') || '';
        if (expectedSecret) {
            const provided = url.searchParams.get('secret') || req.headers.get('x-webhook-secret') || '';
            // Konstant-tids-sammenligning (undgår timing-orakel på hemmeligheden).
            const a = new TextEncoder().encode(provided);
            const b = new TextEncoder().encode(expectedSecret);
            let diff = a.length ^ b.length;
            for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
            if (diff !== 0) {
                console.warn(`[accounting-webhooks] Afvist: forkert/manglende hemmelighed (source=${source}).`);
                return new Response(JSON.stringify({ error: 'unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
            }
        } else {
            console.warn('[accounting-webhooks] ADVARSEL: kører UDEN delt hemmelighed — endpointet er uautentificeret. Sæt ACCOUNTING_WEBHOOK_SECRET for at sikre det.');
        }

        let bodyText = "";
        try {
            bodyText = await req.text();
        } catch (e) {
            console.error("Kunne ikke læse body", e);
        }

        let payload: any = {};
        if (bodyText) {
            try {
                payload = JSON.parse(bodyText);
            } catch (e) {
                console.error("Body er ikke gyldig JSON:", bodyText);
            }
        }

        console.log(`Modtog webhook fra [${source}]:`, payload);

        // Find invoiceId
        let invoiceIdStr = '';
        
        // Dinero webhook structure (often payload.Data.Id or payload.Id)
        if (source === 'dinero' || payload.Event?.startsWith('invoice.')) {
            invoiceIdStr = String(payload.Data?.Id || payload.Id || payload.invoiceId || '');
        } 
        // e-conomic webhook structure (often payload.invoice.id or payload.entity.id)
        else if (source === 'economic' || payload.eventType?.includes('payment') || payload.eventType?.includes('invoice')) {
            invoiceIdStr = String(payload.invoice?.id || payload.entity?.id || payload.invoiceId || payload.id || '');
        } 
        else {
            // Generisk faldback
            invoiceIdStr = String(payload.id || payload.invoiceId || payload.invoice_id || payload.Data?.Id || '');
        }

        // Tjek om eventet overhovedet er en "betaling" eller "bogføring"
        // Vi betragter det primært for at markere "betalt".
        let isPaidEvent = false;
        
        const eventName = (payload.Event || payload.eventType || payload.type || '').toLowerCase();
        if (eventName.includes('paid') || eventName.includes('payment')) {
            isPaidEvent = true;
        }

        if (!invoiceIdStr) {
            console.log("Ignorerer webhook: Intet invoiceId fundet i payload.");
            return new Response(JSON.stringify({ success: true, message: 'Ignoreret - mangler invoiceId' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Søg efter sagen hvor invoice_history indeholder dette invoiceId.
        // I Supabase kan vi bruge raw_data->'invoice_history' @> '[{"id": "XX"}]'
        
        // Bemærk at vores ID er gemt enten som string eller number i JSON. Vi prøver begge.
        const idAsString = `[{"id": "${invoiceIdStr}"}]`;
        const idAsNumber = !isNaN(Number(invoiceIdStr)) ? `[{"id": ${Number(invoiceIdStr)}}]` : null;

        let query = supabase.from('leads').select('id, raw_data');
        
        if (idAsNumber) {
             query = query.or(`raw_data->invoice_history.cs.${idAsString},raw_data->invoice_history.cs.${idAsNumber}`);
        } else {
             query = query.contains('raw_data->invoice_history', idAsString);
        }

        const { data: leads, error: searchError } = await query;

        if (searchError) {
            console.error("Fejl ved søgning efter faktura:", searchError);
            throw new Error('Databasefejl under søgning');
        }

        if (!leads || leads.length === 0) {
            console.log(`Fandt ingen sag med faktura ID: ${invoiceIdStr}.`);
            // Måske blev fakturaen lavet udenom systemet - det er okay, vi ignorerer bare.
            return new Response(JSON.stringify({ success: true, message: 'Ukendt faktura id' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
        }

        // Der burde kun være én sag
        const targetLead = leads[0];
        const newRawData = { ...targetLead.raw_data };
        const history = newRawData.invoice_history || [];
        
        let wasUpdated = false;
        let justPaid = false;   // sand hvis en faktura netop skiftede til betalt (→ notifikation)

        for (let i = 0; i < history.length; i++) {
            // Tjekker både mod number og string format
            if (String(history[i].id) === invoiceIdStr) {
                // Hvis vi allerede har markeret den som betalt, behøver vi ikke gøre det igen.
                if (history[i].status !== 'paid' && isPaidEvent) {
                    history[i].status = 'paid';
                    history[i].paid_date = new Date().toISOString();
                    wasUpdated = true;
                    justPaid = true;
                } else if (history[i].status === 'draft' && !isPaidEvent) {
                    // Hvis det bare var et "booked" event
                    history[i].status = 'booked';
                    wasUpdated = true;
                }
            }
        }

        if (wasUpdated) {
            const { error: updateError } = await supabase
                .from('leads')
                .update({ raw_data: newRawData })
                .eq('id', targetLead.id);

            if (updateError) {
                console.error("Fejl ved opdatering af lead:", updateError);
                throw new Error('Databasefejl under opdatering');
            }
            console.log(`Succesfuldt opdateret sag ${targetLead.id} for faktura ${invoiceIdStr}. Ny status satt.`);

            // Faktura netop betalt → send push til mester + kontor. Fejl må ikke vælte webhooken.
            if (justPaid) {
                try {
                    await fetch(`${supabaseUrl}/functions/v1/send-push-reminders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
                        body: JSON.stringify({ type: 'invoice_paid', lead_id: targetLead.id, invoice_id: invoiceIdStr }),
                    });
                } catch (pushErr) {
                    console.error('Faktura-betalt push fejlede:', pushErr);
                }
            }
        } else {
            console.log(`Ingen opdatering nødvendig for faktura ${invoiceIdStr} på sag ${targetLead.id}.`);
        }

        return new Response(JSON.stringify({ success: true, updated: wasUpdated }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

    } catch (error) {
        console.error("Webhook Kritis Fejl:", error.message)
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})
