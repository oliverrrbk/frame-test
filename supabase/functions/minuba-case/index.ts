import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // Hent altid API nøglen via backend for at undgå at frontend RLS blokerer medarbejdere
    const targetCarpenterId = lead.carpenter_id || user.id;
    const { data: profile, error: dbError } = await supabaseClient
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

    let minubaToken;
    let isOauth = false;

    // Check if the key is stored as OAuth JSON (from our new minuba-auth flow)
    try {
        const parsedKey = JSON.parse(finalApiKey);
        if (parsedKey.access_token) {
            minubaToken = parsedKey.access_token;
            isOauth = true;

            // Optional: Implement Token Refresh logic here if token is expired
            // const now = new Date().getTime();
            // if (now > parsedKey.timestamp + (parsedKey.expires_in * 1000)) {
            //     console.log("Minuba token udløbet. Forsøger refresh...");
            //     ... refresh logic ...
            // }
        } else {
            minubaToken = finalApiKey;
        }
    } catch(e) {
        // Not JSON, fallback to manual API key (Basic Auth)
        minubaToken = finalApiKey;
    }

    console.log("Starter Minuba overførsel for:", lead.customer_name);

    const baseUrl = "https://app.minuba.dk/api/v1"; // Placeholder for rigtig endpoint

    // Opsæt auth header alt efter om vi bruger OAuth (Bearer) eller manuel API-nøgle (Basic)
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': isOauth ? `Bearer ${minubaToken}` : `Basic ${btoa(minubaToken + ':')}`
    };

    // 1. Opret Kontakt/Kunde i Minuba
    const contactPayload = {
      name: lead.customer_name || "Ukendt Kunde",
      address: lead.customer_address || "Ukendt Adresse",
      email: lead.customer_email || "",
      phone: lead.customer_phone || "",
      notes: "Oprettet via Bison Frame"
    };

    console.log("Opretter kontakt i Minuba...");
    const contactRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(contactPayload)
    });

    if (!contactRes.ok) {
        const errText = await contactRes.text();
        console.error("Fejl fra Minuba /customers:", errText);
        throw new Error("Kunne ikke oprette kontakt i Minuba. Tjek adgangsrettighederne. Detaljer: " + errText);
    }

    const contactData = await contactRes.json();
    const contactId = contactData.id || contactData.data?.id;

    if (!contactId) {
        throw new Error("Kontakt oprettet, men intet ID returneret fra Minuba.");
    }
    
    console.log("Kontakt oprettet med ID:", contactId);

    // 2. Opret Projekt/Ordre i Minuba
    const projectPayload = {
      title: `${lead.project_category || 'Bison Frame Opgave'} - ${lead.customer_name || 'Kunde'}`,
      customer_id: contactId,
      description: `Tilbudspris (Ekskl. moms): ${lead.raw_data?.actual_quote_price || lead.price_estimate || '0'} kr.\nAdresse: ${lead.customer_address}`
    };

    console.log("Opretter ordre i Minuba...");
    const projectRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(projectPayload)
    });

    if (!projectRes.ok) {
        const errText = await projectRes.text();
        console.error("Fejl fra Minuba /orders:", errText);
        throw new Error("Kontakt oprettet, men kunne ikke oprette opgaven. Fejl: " + errText);
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
