import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
      .from('carpenters')
      .update({ dinero_api_key: JSON.stringify(dineroAuthData) })
      .eq('id', user.id)

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
