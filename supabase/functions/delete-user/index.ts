import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Mangler userId')
    }

    // Opret forbindelse med Service Role nøglen for at få admin rettigheder (gudestatus)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log(`Forsøger at slette bruger med ID: ${userId}`)

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
