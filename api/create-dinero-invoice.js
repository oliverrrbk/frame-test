export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { lead, dineroApiKey, dineroOrgId } = req.body;

        if (!lead || !dineroApiKey || !dineroOrgId) {
            return res.status(400).json({ error: 'Missing required fields (lead, dineroApiKey, dineroOrgId)' });
        }

        // BEMÆRK: Dette er en standard implementation af Dinero's API flow.
        // For at kalde Dinero, skal man normalt først bytte sin API-nøgle til et access_token.
        // Til demonstration/simpel opsætning laves et direkte mock-kald, der kan skiftes ud
        // med rigtige credentials, når platformen er i produktion.

        /* 
        // 1. Authenticate with Dinero
        const authResponse = await fetch('https://authz.dinero.dk/dineroapi/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`bisonframe_client_id:client_secret`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=password&scope=read write&username=${dineroApiKey}&password=${dineroApiKey}`
        });
        const authData = await authResponse.json();
        const accessToken = authData.access_token;
        
        // 2. Opret faktura-kladde
        const invoiceResponse = await fetch(`https://api.dinero.dk/v1/${dineroOrgId}/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ContactGuid: "Kontakt-ID-eller-opret-ny-kontakt-først",
                Currency: "DKK",
                ProductLines: [
                    {
                        Description: `Opgave: ${lead.project_category} - Overslagssystem`,
                        Quantity: 1,
                        Unit: "hours",
                        BaseAmountValue: 5000 // Hent fra lead.price_estimate
                    }
                ]
            })
        });
        const invoiceData = await invoiceResponse.json();
        */

        // MOCK SUCCES (Da vi ikke har ægte Dinero keys endnu):
        console.log(`Faktura-kladde simulering til org ${dineroOrgId} for kunde ${lead.customer_name}`);
        
        return res.status(200).json({ 
            success: true, 
            message: 'Faktura-kladde oprettet succesfuldt (Mock)',
            mock_data: {
                invoiceId: 'DINERO-12345',
                status: 'draft'
            }
        });

    } catch (error) {
        console.error('Dinero API error:', error);
        return res.status(500).json({ error: error.message });
    }
}
