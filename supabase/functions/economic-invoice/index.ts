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
    const { lead } = body

    if (!lead) {
      throw new Error("Mangler lead data")
    }

    console.log("Starter e-conomic overførsel for:", lead.customer_name);

    // 1. Hent tokens fra DB (læg mærke til at tabellen hedder carpenters!)
    const { data: profile, error: dbError } = await supabaseClient
      .from('carpenters')
      .select('economic_api_key')
      .eq('id', user.id)
      .single()

    if (dbError || !profile || !profile.economic_api_key) {
      throw new Error("Ingen e-conomic-forbindelse fundet for profilen")
    }

    const economicToken = profile.economic_api_key;
    const appSecretToken = Deno.env.get('E_CONOMIC_APP_SECRET');

    if (!appSecretToken) {
      throw new Error("Mangler e-conomic App Secret Token i servermiljøet (E_CONOMIC_APP_SECRET)");
    }

    // Helper til e-conomic API kald
    const fetchEconomic = async (method: string, path: string, data: any = null) => {
      const options: RequestInit = {
        method,
        headers: {
          'X-AppSecretToken': appSecretToken,
          'X-AgreementGrantToken': economicToken,
          'Content-Type': 'application/json'
        }
      };
      if (data) options.body = JSON.stringify(data);
      
      const res = await fetch(`https://restapi.e-conomic.com${path}`, options);
      if (!res.ok) {
        const text = await res.text();
        console.error(`e-conomic API Fejl (${path}):`, res.status, text);
        throw new Error(`e-conomic API fejl (${res.status}): ${text}`);
      }
      if (res.status === 204) return null;
      return await res.json();
    };

    // 2. Find nødvendige standard-indstillinger i e-conomic for at oprette kunden
    const customerGroups = await fetchEconomic('GET', '/customer-groups?pagesize=1');
    if (!customerGroups || customerGroups.collection.length === 0) throw new Error("Fandt ingen kundegrupper i e-conomic");
    const customerGroupNumber = customerGroups.collection[0].customerGroupNumber;

    const vatZones = await fetchEconomic('GET', '/vat-zones?pagesize=1');
    if (!vatZones || vatZones.collection.length === 0) throw new Error("Fandt ingen momszoner i e-conomic");
    const vatZoneNumber = vatZones.collection[0].vatZoneNumber;

    const paymentTerms = await fetchEconomic('GET', '/payment-terms?pagesize=1');
    if (!paymentTerms || paymentTerms.collection.length === 0) throw new Error("Fandt ingen betalingsbetingelser i e-conomic");
    const paymentTermsNumber = paymentTerms.collection[0].paymentTermsNumber;

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

    // 3. Opret Kontakt (Kunde)
    let customerNumber;
    
    // Check om kunden findes via email
    if (lead.customer_email) {
      const searchRes = await fetchEconomic('GET', `/customers?filter=email$eq:${encodeURIComponent(lead.customer_email)}`);
      if (searchRes && searchRes.collection && searchRes.collection.length > 0) {
        customerNumber = searchRes.collection[0].customerNumber;
      }
    }

    // Opret hvis ikke fundet
    if (!customerNumber) {
      const newCustomerPayload: any = {
        name: lead.customer_name || "Ukendt Kunde",
        currency: "DKK",
        customerGroup: { customerGroupNumber },
        vatZone: { vatZoneNumber },
        paymentTerms: { paymentTermsNumber }
      };
      
      if (lead.customer_email) newCustomerPayload.email = lead.customer_email;
      if (lead.customer_phone) newCustomerPayload.telephoneAndFaxNumber = lead.customer_phone;
      if (address) newCustomerPayload.address = address;
      if (zipCode) newCustomerPayload.zip = zipCode;
      if (city) newCustomerPayload.city = city;

      const contactRes = await fetchEconomic('POST', '/customers', newCustomerPayload);
      customerNumber = contactRes.customerNumber;
    }

    console.log("CustomerNumber:", customerNumber);

    // 4. Find standard Layout for at oprette faktura
    const layouts = await fetchEconomic('GET', '/layouts?pagesize=1');
    if (!layouts || layouts.collection.length === 0) throw new Error("Fandt intet faktura-layout i e-conomic");
    const layoutNumber = layouts.collection[0].layoutNumber;

    // 4.5. Find en vare (product) til fakturalinjen
    const products = await fetchEconomic('GET', '/products?pagesize=1');
    if (!products || products.collection.length === 0) throw new Error("Fandt ingen varer i e-conomic. Opret venligst en standardvare i dit regnskabsprogram.");
    const productNumber = products.collection[0].productNumber;

    // Udtræk pris og fjern moms (pris er inkl. moms, så vi dividerer med 1.25)
    const rawPrice = typeof lead.price_estimate === 'number' 
      ? lead.price_estimate 
      : parseInt((lead.price_estimate || '0').replace(/[^0-9]/g, '').substring(0, 5)) || 0;
    const priceExVat = Math.round(rawPrice / 1.25);

    // 5. Opret Fakturakladde
    const invoiceRes = await fetchEconomic('POST', '/invoices/drafts', {
      date: new Date().toISOString().split('T')[0],
      currency: "DKK",
      customer: { customerNumber },
      recipient: {
        name: lead.customer_name || "Ukendt Kunde",
        vatZone: { vatZoneNumber }
      },
      layout: { layoutNumber },
      paymentTerms: { paymentTermsNumber },
      lines: [
        {
          description: `Opgave: ${lead.project_category || 'Tømreropgave'} ${lead.customer_address ? `på ${lead.customer_address}` : ''}`.trim(),
          quantity: 1,
          unitNetPrice: priceExVat,
          product: { productNumber }
        }
      ]
    });

    console.log("Faktura oprettet:", invoiceRes);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Fakturakladde oprettet i e-conomic",
        invoiceId: invoiceRes.draftInvoiceNumber || "Ukendt ID"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i economic-invoice function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      // Returnér status 200, så frontenden pænt kan håndtere og udskrive fejlen til brugeren
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
