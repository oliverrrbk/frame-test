import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

import { corsHeadersFor } from "../_shared/cors.ts"

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  // Håndter CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirectUri } = await req.json()
    
    // Hent environment variables (sat i Supabase)
    const clientId = Deno.env.get('DINERO_CLIENT_ID')
    const clientSecret = Deno.env.get('DINERO_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Dinero credentials mangler i miljøvariablerne')
    }

    if (!code) {
      throw new Error('Ingen authorization code modtaget')
    }

    console.log("Veksler Dinero auth code til tokens... v3");

    // Basic Auth string for Visma Connect: base64(client_id:client_secret)
    const credentials = btoa(`${clientId}:${clientSecret}`)

    // 1. Send code til Visma Connect for at få access token + refresh token
    const tokenResponse = await fetch('https://connect.visma.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri || 'https://app.bisonframe.dk/dashboard?tab=integrations'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Fejl fra Visma Connect:", errorText);
      throw new Error(`Kunne ikke validere Dinero kode: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    
    const dineroAuthData = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      timestamp: new Date().getTime()
    };

    // --- NYT: AUTOMATISK WEBHOOK REGISTRERING (BAGGRUND) ---
    // Vi kører dette asynkront (uden await) for at undgå at ramme Supabase's 5-sekunders timeout!
    const setupWebhooks = async () => {
      try {
        console.log("Henter organisationer for at sætte webhook op...");
        const orgsResponse = await fetch('https://api.dinero.dk/v1/organizations', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });
        
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          for (const org of orgsData) {
            console.log(`Forsøger at oprette webhook på org: ${org.id}`);
            const webhookUrl = "https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/accounting-webhooks?source=dinero";
            
            await fetch(`https://api.dinero.dk/v1/${org.id}/webhooks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: webhookUrl,
                events: [
                  "invoice.booked",
                  "invoice.paid"
                ]
              })
            });
          }
        }
      } catch (whError) {
        console.error("Fejl ved automatisk opsætning af webhook (ignoreres):", whError);
      }
    };

    // Kør webhook-opsætningen uden at vente på at den bliver færdig
    // EdgeRuntime.waitUntil sikrer at Deno ikke dræber processen, før dette er færdigt i baggrunden
    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      EdgeRuntime.waitUntil(setupWebhooks());
    } else {
      setupWebhooks(); // Falder tilbage på standard floating promise
    }
    // --- SLUT PÅ WEBHOOK ---

    // 2. Find brugeren og gem
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Mangler Authorization header - Frontend sendte ikke token!')
        
    const jwt = authHeader.replace('Bearer ', '')
    console.log("Modtog JWT (længde):", jwt.length);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Bypasses RLS to ensure we can save it!
    )

    // Hent brugerens ID ud fra deres token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      console.error("User Auth Error:", userError)
      throw new Error(`Auth fejl: ${userError?.message || 'Ukendt fejl ved verificering af token'}`)
    }

    console.log("Bruger identificeret succesfuldt:", user.id);

    // Opdater databasen med Service Role for at være 100% sikker på at RLS ikke blokerer
    const { error: dbError } = await supabaseClient
      .from('carpenter_secrets')
      .upsert({ 
          carpenter_id: user.id, 
          dinero_api_key: JSON.stringify(dineroAuthData) 
      })

    if (dbError) {
      throw new Error(`Fejl ved opdatering af profil: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: "Dinero er nu forbundet!" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error("Fejl i dinero-auth function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
