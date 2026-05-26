import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { applyCors } from './_cors.js';
import { rateLimit } from './_ratelimit.js';

if (!process.env.VERCEL) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env' });
    dotenv.config({ path: '.env.local' });
}

export const maxDuration = 30; // 30 seconds max duration

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit: max 120 support-requests per IP per hour
    const rl = await rateLimit(req, { limit: 120, windowSec: 3600, suffix: 'ai-support' });
    if (!rl.ok) {
        if (rl.retryAfter) res.setHeader('Retry-After', String(rl.retryAfter));
        return res.status(429).json({ error: 'For mange forespørgsler. Prøv igen om lidt.' });
    }

    try {
        const { messages, contextData } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Missing required field: messages' });
        }

        const activeStep = contextData?.activeStep || 1;
        const category = contextData?.category || 'ikke valgt endnu';
        const answers = JSON.stringify(contextData?.answers || {});
        const carpenterName = contextData?.carpenterInfo?.owner_name?.split(' ')[0] || 'Tømreren';
        const carpenterCompany = contextData?.carpenterInfo?.company_name || 'Tømrervirksomhed';

        // Guard against basis tier companies triggering AI calls
        if (contextData?.carpenterInfo?.tier === 'basis') {
            return res.status(403).json({ error: 'Denne virksomhed har ikke adgang til AI-modulet.' });
        }

        const systemPromptText = `Du er en dygtig, erfaren og professionel byggerådgiver, der svarer på vegne af byggerådgivnings-teamet hos tømrervirksomheden ${carpenterCompany}.
Din funktion er at rådgive kunden, mens de udfylder tilbuds-beregneren på vores platform.

AKTUEL KONTEKST FRA BEREGNEREN SOM DU SKAL VÆRE BEVIDST OM:
- Trin i beregneren: Trin ${activeStep} ud af 4
- Valgt opgavekategori: ${category}
- Kundens nuværende svar i dette trin: ${answers}

CRITICAL RULES & FIREWALLS (MUST ALWAYS BE OBSERVED STRIKT):
1. PRIS-FIREWALL (ULTRA STRIKT): DU MÅ ALDRIG UNDER NOGEN OMSTÆNDIGHEDER OPPLYSE PRISER I KRONER (DKK). Du må absolut IKKE nævne specifikke DKK, kronebeløb, kvadratmeterpriser eller timepriser (f.eks. må du aldrig sige "det koster 1.500 kr", "mellem 10.000 og 20.000 kr" eller lignende). Hvis kunden presser dig for at få en pris, skal du høfligt afvise og forklare, at vores automatiske beregner udregner det præcise vejledende overslag til dem, når de har udfyldt trinene, eller at vi ringer dem op for at give et fast tilbud.
2. PRISAMMENLIGNING ER TILLADT: Du må meget gerne lave relative prissammenligninger (f.eks. "Ipe er et luksusmateriale, som er væsentligt dyrere i indkøb og tager længere tid at montere end trykimprægneret fyr, men det har en meget længere levetid og et mere eksklusivt udtryk").
3. HOLD-IDENTITET (VI/OS/VORES): Svar altid på vegne af hele virksomheden og teamet. Du skal konsekvent bruge "vi", "os" og "vores" (f.eks. "Vi anbefaler...", "Hos os lægger vi stor vægt på..."). Du må ALDRIG bruge "jeg", "mig" eller referere til tømreren som en udefrakommende tredje person (f.eks. "tømreren", "han"). Vi arbejder som et professionelt hold.
4. RÅDGIVNING OG MATERIALEVALG: Giv kompetent rådgivning om materialevalg, byggetekniske detaljer, samt fordele og ulemper ved forskellige valg. Hjælp kunden med at forstå spørgsmålene i beregneren.
5. FORMATERING: Skriv i en pæn, letlæselig, professionel og klar ren tekst uden markdown-stjerner eller overskrifter (ingen **, * eller #).

Hold svarene relativt korte og præcise, så de passer ind i det lille chat-panel uden at overvælde brugeren.`;

        const aiProvider = (process.env.AI_PROVIDER || 'claude').toLowerCase();
        const isClaude = aiProvider === 'claude' || aiProvider === 'anthropic';

        let responseText = '';

        if (isClaude) {
            try {
                const anthropic = new Anthropic({
                    apiKey: process.env.ANTHROPIC_API_KEY
                });

                const response = await anthropic.messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    system: systemPromptText,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    max_tokens: 1000,
                });

                const textBlock = response.content.find(block => block.type === 'text');
                responseText = textBlock ? textBlock.text : '';
            } catch (claudeError) {
                console.error("Claude AI support API failed:", claudeError);
            }
        }

        if (!responseText) {
            // OpenAI fallback
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
            });

            const fullMessages = [{ role: 'system', content: systemPromptText }, ...messages];

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: fullMessages,
                max_completion_tokens: 1000,
            });

            responseText = completion.choices[0].message?.content || '';
        }

        return res.status(200).json({
            success: true,
            content: responseText
        });

    } catch (error) {
        console.error('AI support API error:', error);
        return res.status(500).json({
            error: error.message || 'Der opstod en fejl ved kontakt til AI.'
        });
    }
}
