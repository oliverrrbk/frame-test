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
    const { lead, api_key } = body

    if (!lead) {
      throw new Error("Mangler lead data")
    }

    let finalApiKey = api_key;

    const targetCarpenterId = lead.carpenter_id || user.id;
    const { data: profile } = await supabaseClient
      .from('carpenter_secrets')
      .select('minuba_api_key')
      .eq('carpenter_id', targetCarpenterId)
      .single()

    if (profile && profile.minuba_api_key) {
        finalApiKey = profile.minuba_api_key;
    }

    if (!finalApiKey) {
      throw new Error("Mangler Minuba API-nøgle")
    }

    let minubaToken = finalApiKey;
    let minubaClientId = "";
    
    try {
        const parsedKey = JSON.parse(finalApiKey);
        if (parsedKey.api_key) {
            minubaToken = parsedKey.api_key;
            if (parsedKey.client_id) {
                minubaClientId = parsedKey.client_id;
            }
        }
    } catch(e) {
        // Not JSON, fallback
        minubaToken = finalApiKey;
    }

    console.log("Starter Minuba overførsel for:", lead.customer_name);

    const baseUrl = "https://app.minuba.dk/api";
    
    // Auth header fallback: Basic clientId:Token
    const authString = minubaClientId ? `${minubaClientId}:${minubaToken}` : `${minubaToken}:`;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(authString)}`
    };

    // 1. Opret Kontakt/Kunde i Minuba
    const contactPayload = {
      name: lead.customer_name || "Ukendt Kunde",
      description: "Oprettet via Bison Frame",
      email: lead.customer_email || "",
      phone: lead.customer_phone || ""
    };

    console.log("Opretter kontakt i Minuba...");
    const contactRes = await fetch(`${baseUrl}/Client`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(contactPayload)
    });

    if (!contactRes.ok) {
        const errText = await contactRes.text();
        console.error("Fejl fra Minuba /Client:", errText);
        throw new Error(`Minuba afviste API nøglen/Client ID'et (Kode ${contactRes.status}). Fejlbesked: ${errText}`);
    }

    const contactData = await contactRes.json();
    const contactId = contactData.id || contactData.data?.id;

    if (!contactId) {
        throw new Error("Kontakt oprettet, men intet ID returneret fra Minuba.");
    }
    
    console.log("Kontakt oprettet med ID:", contactId);

    // 2. Opret Projekt/Ordre i Minuba
    const projectPayload = {
      name: `${lead.project_category || 'Bison Frame Opgave'} - ${lead.customer_name || 'Kunde'}`,
      description: `Tilbudspris (Ekskl. moms): ${lead.raw_data?.actual_quote_price || lead.price_estimate || '0'} kr.\nAdresse: ${lead.customer_address}`,
      clientId: contactId,
      orderTypeId: "00000000-0000-0000-0000-000000000000" // Minuba kræver muligvis orderTypeId
    };

    console.log("Opretter ordre i Minuba...");
    const projectRes = await fetch(`${baseUrl}/Order`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(projectPayload)
    });

    if (!projectRes.ok) {
        const errText = await projectRes.text();
        console.error("Fejl fra Minuba /Order:", errText);
        throw new Error("Kontakt oprettet, men kunne ikke oprette opgaven i Minuba. Fejl: " + errText);
    }

    const projectData = await projectRes.json();
    const projectId = projectData.id || projectData.data?.id || "Ukendt ID";

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Sag oprettet i Minuba!",
        caseId: projectId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i minuba-case function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }, // Status 200 for at frontend håndterer fejlen pænt
    )
  }
})
