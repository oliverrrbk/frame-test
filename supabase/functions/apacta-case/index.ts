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
      throw new Error("Mangler Apacta API-nøgle")
    }

    console.log("Starter ægte Apacta overførsel for:", lead.customer_name);

    const baseUrl = "https://app.apacta.com/api/v1";

    // 1. Opret Kontakt (Kunde) i Apacta
    const contactPayload = {
      name: lead.customer_name || "Ukendt Kunde",
      address: lead.customer_address || "Ukendt Adresse",
      email: lead.customer_email || "",
      phone: lead.customer_phone || "",
      description: "Oprettet via Bison Frame"
    };

    console.log("Opretter kontakt i Apacta...");
    // Apacta bruger primært api_key som query parameter eller Bearer auth, men vi prøver med query param som dokumenteret.
    const contactRes = await fetch(`${baseUrl}/contacts?api_key=${api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(contactPayload)
    });

    if (!contactRes.ok) {
        const errText = await contactRes.text();
        console.error("Fejl fra Apacta /contacts:", errText);
        throw new Error("Kunne ikke oprette kontakt i Apacta. Tjek API-nøglen. Detaljer: " + errText);
    }

    const contactData = await contactRes.json();
    const contactId = contactData.data?.id || contactData.id;

    if (!contactId) {
        throw new Error("Kontakt oprettet, men intet ID returneret fra Apacta.");
    }
    
    console.log("Kontakt oprettet med ID:", contactId);

    // 2. Opret Projekt (Sag) i Apacta
    const projectPayload = {
      name: `${lead.project_category || 'Bison Frame Opgave'} - ${lead.customer_name || 'Kunde'}`,
      contact_id: contactId,
      description: `Estimat givet: ${lead.price_estimate || '0'} kr.\nAdresse: ${lead.customer_address}`,
      street_name: lead.customer_address || ""
    };

    console.log("Opretter projekt i Apacta...");
    const projectRes = await fetch(`${baseUrl}/projects?api_key=${api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(projectPayload)
    });

    if (!projectRes.ok) {
        const errText = await projectRes.text();
        console.error("Fejl fra Apacta /projects:", errText);
        throw new Error("Kontakt oprettet, men kunne ikke oprette projektet. Fejl: " + errText);
    }

    const projectData = await projectRes.json();
    const projectId = projectData.data?.id || projectData.id || "Ukendt ID";

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Projekt oprettet i Apacta!",
        caseId: projectId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i apacta-case function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
