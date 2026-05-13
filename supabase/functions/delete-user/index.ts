import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

import { corsHeadersFor } from "../_shared/cors.ts"

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  // Håndter CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Mangler userId')
    }

    // Verificér kalderens JWT før vi rører service-role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Mangler Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }
    const jwt = authHeader.replace('Bearer ', '')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: { user: caller }, error: callerErr } = await supabaseClient.auth.getUser(jwt)
    if (callerErr || !caller) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Tilladt: kalderen sletter sig selv ELLER kalderen er super-admin
    const { data: callerProfile } = await supabaseClient
      .from('carpenters')
      .select('id, role')
      .eq('id', caller.id)
      .single()

    const isSelfDelete = caller.id === userId
    const isSuperAdmin = callerProfile?.role === 'super_admin'
    if (!isSelfDelete && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Ingen rettigheder til at slette denne bruger' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log(`Forsøger at slette bruger med ID: ${userId} (kalder: ${caller.id})`)

    // Brug Admin API'et til at slette brugeren fra Authentication laget
    const { data, error } = await supabaseClient.auth.admin.deleteUser(userId)

    if (error) {
      throw error
    }

    console.log('Bruger succesfuldt slettet:', data)

    return new Response(
      JSON.stringify({ success: true, message: 'Bruger slettet' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Fejl ved sletning:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
