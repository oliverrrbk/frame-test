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

    if (!api_key) {
      throw new Error("Mangler Minuba API-nøgle")
    }

    console.log("Starter Minuba overførsel for:", lead.customer_name);

    // Bemærk: Minubas rigtige API URL og payload formater er typisk lukket bag login.
    // Nedenstående er en generisk best-practice opbygning af JSON API kald til kunde & sagsoprettelse.
    // Dette skal tilpasses 100% når vi tester første gang med en ægte Minuba nøgle.
    const baseUrl = "https://app.minuba.dk/api/v1"; // Placeholder for rigtig endpoint

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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(api_key + ':')}` // Typisk Basic Auth for API nøgler
      },
      body: JSON.stringify(contactPayload)
    });

    if (!contactRes.ok) {
        const errText = await contactRes.text();
        console.error("Fejl fra Minuba /customers:", errText);
        throw new Error("Kunne ikke oprette kontakt i Minuba. Tjek API-nøglen. Detaljer: " + errText);
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
      description: `Estimat givet: ${lead.price_estimate || '0'} kr.\nAdresse: ${lead.customer_address}`
    };

    console.log("Opretter ordre i Minuba...");
    const projectRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(api_key + ':')}`
      },
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
