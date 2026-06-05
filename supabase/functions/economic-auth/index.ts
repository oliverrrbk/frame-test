import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeadersFor } from "../_shared/cors.ts"

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    
    if (!token) {
      throw new Error('Ingen e-conomic token modtaget')
    }

    const appSecretToken = Deno.env.get('E_CONOMIC_APP_SECRET')
    if (!appSecretToken) {
      throw new Error('Mangler E_CONOMIC_APP_SECRET i servermiljøet')
    }

    // 1. Setup Webhooks in e-conomic
    const webhookUrl = "https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/accounting-webhooks?source=economic";
    
    console.log("Forsøger at opsætte e-conomic webhooks...");
    const fetchEconomic = async (method: string, path: string, data: any = null) => {
      const options: RequestInit = {
        method,
        headers: {
          'X-AppSecretToken': appSecretToken,
          'X-AgreementGrantToken': token,
          'Content-Type': 'application/json'
        }
      };
      if (data) options.body = JSON.stringify(data);
      const res = await fetch(`https://restapi.e-conomic.com${path}`, options);
      if (!res.ok) {
        const text = await res.text();
        console.error(`e-conomic API Fejl (${path}):`, res.status, text);
        return null;
      }
      if (res.status === 204) return null;
      return await res.json();
    };

    // e-conomic webhooks API POST
    await fetchEconomic('POST', '/webhooks', {
      events: [
        "InvoiceBooked"
      ],
      url: webhookUrl
    });

    // Bemærk: e-conomic kalder deres webhook eventTypes med stort startbogstav typically, 
    // fx "InvoiceBooked", men hvis det fejler pga. event navnet, ignoreres det og auth fortsætter.

    // 2. Find brugeren og gem
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Mangler Authorization header - Frontend sendte ikke token!')
        
    const jwt = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) throw new Error(`Auth fejl: Bruger ikke fundet`)

    // Opdater databasen med Service Role
    const { error: dbError } = await supabaseClient
      .from('carpenter_secrets')
      .upsert({ 
          carpenter_id: user.id, 
          economic_api_key: token 
      })

    if (dbError) {
      throw new Error(`Fejl ved opdatering af profil: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: "e-conomic er nu forbundet!" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Fejl i economic-auth function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
