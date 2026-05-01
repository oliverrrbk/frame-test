export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { lead, economicAppSecretToken, economicAgreementGrantToken } = req.body;

        if (!lead || !economicAppSecretToken || !economicAgreementGrantToken) {
            return res.status(400).json({ error: 'Missing required fields (lead, AppSecretToken, AgreementGrantToken)' });
        }

        // BEMÆRK: Dette er en standard implementation af e-conomic's REST API.
        // E-conomic bruger to tokens i deres headers til autentificering.
        // Til demonstration laves et direkte mock-kald, der kan skiftes ud
        // med rigtige credentials, når platformen er i produktion.

        /* 
        // Opret faktura-kladde i e-conomic
        const invoiceResponse = await fetch('https://restapi.e-conomic.com/invoices/drafts', {
            method: 'POST',
            headers: {
                'X-AppSecretToken': economicAppSecretToken,
                'X-AgreementGrantToken': economicAgreementGrantToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                currency: "DKK",
                customer: {
                    customerNumber: 1 // Kræver normalt at kunden først er oprettet eller slået op i e-conomic
                },
                layout: {
                    layoutNumber: 1
                },
                paymentTerms: {
                    paymentTermsNumber: 1
                },
                lines: [
                    {
                        lineNumber: 1,
                        product: {
                            productNumber: "1" // Et eksisterende produktnummer i e-conomic
                        },
                        description: `Opgave: ${lead.project_category} - Overslagssystem`,
                        quantity: 1,
                        unitNetPrice: 5000 // Hent fra lead.price_estimate
                    }
                ]
            })
        });
        const invoiceData = await invoiceResponse.json();
        
        if (!invoiceResponse.ok) {
            throw new Error(invoiceData.message || 'Fejl fra e-conomic');
        }
        */

        // MOCK SUCCES (Da vi ikke har ægte e-conomic keys endnu):
        console.log(`Faktura-kladde simulering til e-conomic for kunde ${lead.customer_name}`);
        
        return res.status(200).json({ 
            success: true, 
            message: 'Faktura-kladde oprettet succesfuldt (Mock)',
            mock_data: {
                invoiceId: 'ECO-98765',
                status: 'draft'
            }
        });

    } catch (error) {
        console.error('e-conomic API error:', error);
        return res.status(500).json({ error: error.message });
    }
}
