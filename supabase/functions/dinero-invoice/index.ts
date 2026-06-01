import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import { corsHeadersFor } from "../_shared/cors.ts"

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Mangler Authorization header')
    
    const jwt = authHeader.replace('Bearer ', '')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) throw new Error("Bruger ikke logget ind")

    const body = await req.json()
    const { lead, action = 'draft', invoiceLines = [] } = body

    if (!lead) {
      throw new Error("Mangler lead data")
    }
    
    if (!invoiceLines || invoiceLines.length === 0) {
      throw new Error("Mangler fakturalinjer");
    }

    console.log("Starter Dinero overførsel for:", lead.customer_name);

    // 1. Hent tokens fra DB
    const { data: profile, error: dbError } = await supabaseClient
      .from('carpenter_secrets')
      .select('dinero_api_key')
      .eq('carpenter_id', user.id)
      .single()

    if (dbError || !profile || !profile.dinero_api_key) {
      throw new Error("Ingen Dinero-forbindelse fundet for profilen")
    }

    let tokenData;
    try {
      tokenData = JSON.parse(profile.dinero_api_key);
    } catch(e) {
      throw new Error("Ugyldigt token format i databasen");
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Mangler access_token i profilen");

    // Helper til Dinero API kald
    const fetchDinero = async (method, path, data = null) => {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };
      if (data) options.body = JSON.stringify(data);
      
      const res = await fetch(`https://api.dinero.dk/v1${path}`, options);
      if (!res.ok) {
        const text = await res.text();
        console.error(`Dinero API Fejl (${path}):`, res.status, text);
        throw new Error(`Dinero API fejl (${res.status}): ${text}`);
      }
      // Nogle endpoints returnerer tomt, andre JSON
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    };

    // 2. Find Organization ID
    const orgs = await fetchDinero('GET', '/organizations');
    if (!orgs || orgs.length === 0) throw new Error("Ingen virksomhed fundet på Dinero kontoen");
    const orgId = orgs[0].id;
    console.log("Bruger organisation ID:", orgId);

    // Parse adresse
    let address = lead.customer_address || '';
    let zipCode = '';
    let city = '';
    const zipCityMatch = address.match(/(\d{4})\s+(.+)$/);
    if (zipCityMatch) {
        zipCode = zipCityMatch[1];
        city = zipCityMatch[2].trim();
        address = address.replace(zipCityMatch[0], '').replace(/,\s*$/, '').trim();
    }

    // 3. Opret Kontakt
    let contactGuid;
    try {
      const contactPayload = {
        name: lead.customer_name || "Ukendt Kunde",
        email: lead.customer_email || "",
        phone: lead.customer_phone || "",
        street: address,
        zipCode: zipCode,
        city: city,
        isPerson: !isReverseCharge,
        countryKey: "DK"
      };
      
      const contactRes = await fetchDinero('POST', `/${orgId}/contacts`, contactPayload);
      contactGuid = contactRes.contactGuid;
    } catch (contactError) {
      // Hvis den fejler fordi kunden findes, slå op i stedet
      console.log("Kunde kunne ikke oprettes (måske findes den?), prøver at søge...");
      const searchRes = await fetchDinero('GET', `/${orgId}/contacts?query=${encodeURIComponent(lead.customer_email || lead.customer_name)}`);
      if (searchRes && searchRes.Collection && searchRes.Collection.length > 0) {
        contactGuid = searchRes.Collection[0].contactGuid;
      } else {
        throw new Error("Kunne ikke oprette og ikke finde kunden i Dinero.");
      }
    }

    console.log("KontaktGuid:", contactGuid);

    // 4. Opret Fakturakladde
    const mappedLines = invoiceLines.map(line => ({
      Description: line.description,
      BaseAmountValue: Number(line.priceExVat || 0),
      Quantity: 1,
      AccountNumber: 1000,
      Unit: "parts"
    }));

    if (isReverseCharge) {
      mappedLines.push({
        Description: "Omvendt betalingspligt, køber afregner momsen",
        BaseAmountValue: 0,
        Quantity: 1,
        AccountNumber: 1000,
        Unit: "parts"
      });
    }

    const invoiceRes = await fetchDinero('POST', `/${orgId}/invoices`, {
      ContactGuid: contactGuid,
      Currency: "DKK",
      Language: "da-DK",
      ProductLines: mappedLines
    });

    console.log("Faktura oprettet:", invoiceRes);
    
    let invoiceGuid = invoiceRes.Guid || invoiceRes.invoiceGuid;
    let message = "Fakturakladde oprettet i Dinero";

    if (action === 'book_and_send' && invoiceGuid) {
      try {
        console.log("Bogfører faktura i Dinero...");
        // Dinero endpoint for at booke: POST /v1/{organizationId}/invoices/{guid}/book
        await fetchDinero('POST', `/${orgId}/invoices/${invoiceGuid}/book`, {
          Timestamp: invoiceRes.Timestamp || new Date().toISOString()
        });
        message = "Faktura er bogført i Dinero!";
        
        // Bemærk: At sende mail kræver e-mailopsætning i Dinero, vi lader booking være nok for nu.
      } catch (err) {
        console.warn("Kunne ikke bogføre faktura automatisk i Dinero:", err.message);
        message = `Fakturakladde oprettet (fejl under automatisk bogføring: ${err.message})`;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        invoiceId: invoiceGuid || "Ukendt ID"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i dinero-invoice function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
