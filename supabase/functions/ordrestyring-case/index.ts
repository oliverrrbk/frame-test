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
      throw new Error("Mangler Ordrestyring API-nøgle")
    }

    console.log("Starter ægte Ordrestyring overførsel for:", lead.customer_name);

    // Basic Auth til Ordrestyring v2
    const authString = btoa(`${api_key}:api`);
    const baseUrl = "https://v2.api.ordrestyring.dk";

    // Unikt kundenummer
    const customerNumber = `BF-${lead.id.toString().slice(0, 8)}-${Date.now().toString().slice(-4)}`;

    // Parse adresse for postnummer og by
    let zip = "0000";
    let city = "Ukendt By";
    let addr = lead.customer_address || "Ukendt Adresse 1";

    const zipCityRegex = /(\d{4})\s+(.+)$/;
    const match = addr.match(zipCityRegex);
    if (match) {
        zip = match[1];
        city = match[2];
        addr = addr.replace(zipCityRegex, '').replace(/,\s*$/, '').trim();
    }

    // 1. Opret Kunde (Debtor)
    const customerPayload = {
      customer_number: customerNumber,
      customer_name: lead.customer_name || "Ukendt Kunde",
      customer_address: addr,
      customer_postalcode: zip,
      customer_city: city,
      invoice_address: addr,
      invoice_postalcode: zip,
      invoice_city: city,
      invoice_name: lead.customer_name || "Ukendt Kunde",
      invoice_telephone: lead.customer_phone || "",
      invoice_mobile: lead.customer_phone || "",
      invoice_email: lead.customer_email || "",
      customer_telephone: lead.customer_phone || "",
      customer_mobile: lead.customer_phone || "",
      customer_email: lead.customer_email || "",
      customer_remarks: "Oprettet automatisk via Bison Frame"
    };

    console.log("Opretter kunde i Ordrestyring...");
    const customerRes = await fetch(`${baseUrl}/debtors`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerPayload)
    });

    if (!customerRes.ok) {
        const errText = await customerRes.text();
        console.error("Fejl fra Ordrestyring /debtors:", errText);
        throw new Error("Kunne ikke oprette kunde i Ordrestyring. Er API-nøglen korrekt? " + errText);
    }

    console.log("Kunde oprettet med nummer:", customerNumber);

    // Byg en god og detaljeret beskrivelse til sagen
    const category = lead.project_category || 'Opgave';
    const estimate = lead.price_estimate || '0';
    
    let description = `Opgave: ${category}\nEstimeret pris: ${estimate} kr.\n\n`;
    
    if (lead.details) {
        let detailsObj = typeof lead.details === 'string' ? JSON.parse(lead.details) : lead.details;
        
        if (detailsObj.notes) {
            description += `Bemærkninger fra kunden:\n${detailsObj.notes}\n\n`;
        }
        
        if (detailsObj.aiBreakdown && detailsObj.aiBreakdown.length > 0) {
            description += `Beregningsoversigt:\n`;
            detailsObj.aiBreakdown.forEach((item: any) => {
                description += `- ${item.item}: ${item.hours} timer, ${item.materials} kr. i materialer\n`;
            });
            description += '\n';
        }

        if (detailsObj.aiLaborHours || detailsObj.aiMaterialCost) {
            description += `Samlet estimeret arbejdstid: ${detailsObj.aiLaborHours || 0} timer\n`;
            description += `Samlet estimeret materialeindkøb: ${detailsObj.aiMaterialCost || 0} kr.\n`;
        }
    }

    // 2. Opret Sag (Case)
    const casePayload = {
      customer_number: customerNumber,
      description: description.trim()
    };

    console.log("Opretter sag i Ordrestyring...");
    const caseRes = await fetch(`${baseUrl}/cases`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(casePayload)
    });

    if (!caseRes.ok) {
        const errText = await caseRes.text();
        console.error("Fejl fra Ordrestyring /cases:", errText);
        throw new Error("Kunde oprettet, men kunne ikke oprette sagen. Fejl: " + errText);
    }

    const locationHeader = caseRes.headers.get('Location') || caseRes.headers.get('location');
    console.log("Location header:", locationHeader);

    const caseData = await caseRes.json();
    let publicCaseNumber = caseData.case_number || caseData.id;
    let caseId = publicCaseNumber || "Ukendt ID";
    let internalId = null;
    let casesListDebug = null;

    if (publicCaseNumber) {
        let retries = 3;
        while (retries > 0 && !internalId) {
            try {
                // Vent 1 sekund for at lade Ordrestyring indeksere den nye sag
                await new Promise(r => setTimeout(r, 1000));
                
                console.log(`Henter internt ID via GraphQL for sagsnummer: ${publicCaseNumber} (Forsøg tilbage: ${retries})`);
                
                const graphqlQuery = {
                    query: `
                        query {
                          cases {
                            items {
                              id
                              caseNumber
                            }
                          }
                        }
                    `
                };

                const getRes = await fetch(`https://graphql.ordrestyring.dk/graphql`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${api_key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(graphqlQuery)
                });
                
                if (getRes.ok) {
                    const graphqlData = await getRes.json();
                    casesListDebug = graphqlData;
                    
                    const items = graphqlData?.data?.cases?.items || [];

                    if (items.length > 0) {
                        // Find den korrekte case
                        const matchedCase = items.find((c: any) => String(c.caseNumber) === String(publicCaseNumber));
                        
                        if (matchedCase && matchedCase.id) {
                            internalId = matchedCase.id;
                            caseId = internalId; // Vi opdaterer caseId til at være det interne ID!
                            console.log("Fandt internt ID via GraphQL:", internalId);
                        } else {
                            console.log("GraphQL fandt ikke sagen (endnu). Venter...");
                        }
                    } else {
                        console.log("GraphQL returnerede ingen sager endnu... Prøver igen.");
                    }
                } else {
                    const errText = await getRes.text();
                    console.error("Fejl fra GraphQL:", errText);
                }
            } catch (e) {
                console.error("Kunne ikke hente internt ID:", e);
            }
            retries--;
        }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Sag oprettet i Ordrestyring!",
        caseId: String(caseId),
        fullCaseData: caseData,
        internalId: internalId,
        locationHeader: locationHeader,
        casesList: casesListDebug
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i ordrestyring-case function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
