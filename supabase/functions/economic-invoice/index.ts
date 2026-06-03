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
    const { lead, action = 'draft', invoiceLines = [], isReverseCharge = false } = body

    if (!lead) {
      throw new Error("Mangler lead data")
    }

    if (!invoiceLines || invoiceLines.length === 0) {
      throw new Error("Mangler fakturalinjer");
    }

    console.log("Starter e-conomic overførsel for:", lead.customer_name);

    // 1. Hent tokens fra DB (læg mærke til at tabellen hedder carpenters!)
    const targetCarpenterId = lead.carpenter_id || user.id;
    const { data: profile, error: dbError } = await supabaseClient
      .from('carpenter_secrets')
      .select('economic_api_key')
      .eq('carpenter_id', targetCarpenterId)
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
    if (address && address.length > 3 && address !== ",  ") {
        const zipCityMatch = address.match(/(\d{4})\s+(.+)$/);
        if (zipCityMatch) {
            zipCode = zipCityMatch[1];
            city = zipCityMatch[2].trim();
            address = address.replace(zipCityMatch[0], '').replace(/,\s*$/, '').trim();
        }
    } else {
        address = 'Ikke oplyst';
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

    let mappedLines = invoiceLines.map((line: any) => ({
      description: line.description,
      quantity: 1,
      unitNetPrice: Number(line.priceExVat || 0),
      product: { productNumber }
    }));

    if (isReverseCharge) {
      mappedLines.push({
        description: "Omvendt betalingspligt, køber afregner momsen",
        quantity: 1,
        unitNetPrice: 0,
        product: { productNumber }
      });
    }

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
      lines: mappedLines
    });

    console.log("Faktura oprettet:", invoiceRes);
    
    let bookedInvoiceNumber = null;
    let message = "Fakturakladde oprettet i e-conomic";

    // 6. Hvis action er 'book_and_send', book fakturaen og send
    if (action === 'book_and_send' && invoiceRes.draftInvoiceNumber) {
      try {
        console.log("Bogfører faktura i e-conomic...");
        const bookRes = await fetchEconomic('POST', '/invoices/booked', {
          draftInvoice: { draftInvoiceNumber: invoiceRes.draftInvoiceNumber },
          sendBy: "Email"
        });
        bookedInvoiceNumber = bookRes.bookedInvoiceNumber;
        message = "Faktura er bogført og klargjort i e-conomic!";
        console.log("Faktura bogført:", bookRes);

        // Nogle e-conomic opsætninger mangler mail-udvidelse, så vi forsøger mail-kaldet i try/catch
        /* 
        NOTE: Der mangler ofte standard modtager-mailopsætning på demo-konti. 
        Hvis dette fejler, fortsætter vi, da fakturaen trods alt er bogført.
        */
      } catch (err) {
        console.warn("Kunne ikke bogføre eller sende faktura automatisk:", err.message);
        message = `Fakturakladde oprettet (fejl under automatisk bogføring: ${err.message})`;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        invoiceId: bookedInvoiceNumber || invoiceRes.draftInvoiceNumber || "Ukendt ID"
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
