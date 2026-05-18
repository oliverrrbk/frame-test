import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { applyCors } from './_cors.js';
import { rateLimit } from './_ratelimit.js';

// dotenv kun nødvendigt lokalt; i Vercel-produktion er env'erne allerede injected
if (!process.env.VERCEL) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env' });
    dotenv.config({ path: '.env.local' });
}

export const maxDuration = 60; // Tillad op til 60 sekunders eksekveringstid

const MAX_MESSAGES = 30; // Max 30 beskeder for at forhindre misbrug og limitere token-forbrug

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit: max 60 chat-requests pr. IP pr. time (≈ 2 fulde samtaler)
    const rl = await rateLimit(req, { limit: 60, windowSec: 3600, suffix: 'chat' });
    if (!rl.ok) {
        if (rl.retryAfter) res.setHeader('Retry-After', String(rl.retryAfter));
        return res.status(429).json({ error: 'For mange forespørgsler. Prøv igen om lidt.' });
    }

    try {
        const { messages, contextData } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Missing required field: messages' });
        }
        
        // Anti-Spam: Hvis den allersidste besked (fra kunden) er over 1000 tegn, afvis den!
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.content && lastMessage.content.length > 1000) {
            return res.status(400).json({ error: 'Beskeden er for lang (max 1000 tegn).' });
        }
        
        // Sørg for at basis pakker ikke kan trække OpenAI tokens
        if (contextData?.carpenterInfo?.tier === 'basis') {
            return res.status(403).json({ error: 'Denne virksomhed har ikke adgang til AI-modulet. Opgrader venligst til Professionel pakken.' });
        }
        
        // Tjek om grænsen er nået (for at beskytte mod uendelige chats / misbrug)
        if (messages.length >= MAX_MESSAGES) {
            return res.status(200).json({
                success: true,
                message: {
                    role: 'assistant',
                    content: 'For at sikre præcisionen af vores tilbud, kan jeg desværre ikke håndtere flere beskeder i denne samtale. Du kan trykke på knappen for at gå videre med det vi har, eller ringe direkte til os for yderligere rådgivning omkring dit projekt!'
                }
            });
        }

        const aiProvider = process.env.AI_PROVIDER || 'openai';

        // Hent data fra klienten sikkert
        const dbContext = contextData?.dbContext || '';
        const questionsContext = contextData?.questionsContext || '';
        const carpenterName = contextData?.carpenterInfo?.owner_name?.split(' ')[0] || 'Tømreren';
        const carpenterCompany = contextData?.carpenterInfo?.company_name || 'Tømrervirksomhed';

        // BYG SYSTEM PROMPTEN SIKKERT PÅ SERVEREN (Beskytter mod Prompt Injection)
        const systemPromptText = `Du er en dygtig, realistisk og erfaren AI-assistent, der arbejder for den danske tømrer ${carpenterName} fra firmaet ${carpenterCompany}.
Din opgave er at afklare kundens specialopgave på vegne af tømreren, så systemet kan udregne et vejledende overslag (aldrig et bindende tilbud).
Mange AI'er underestimerer byggeopgaver kraftigt. DU SKAL VÆRE REALISTISK OG TÆNKE PÅ ALLE ARBEJDSGANGE!

GUARDRAILS & REGLER FOR SAMTALEN:
1. Vær professionel, empatisk og imødekommende. Skriv på dansk. ANERKEND ALTID OPGAVEN POSITIVT (fx "Et nyt tag! Det lyder spændende, det skal vi nok finde en god løsning på"), inden du begynder at stille dine spørgsmål.
2. Afvis off-topic spørgsmål høfligt: Hvis kunden spørger om emner, der intet har med tømrerarbejde, byggeri, materialer eller opgaven at gøre, SKAL DU AFVISE DEM høfligt.
3. RÅDGIVNING: Du må gerne rådgive om træsorter, byggeprocesser osv.
4. GIV ALDRIG HURTIGE ESTIMATER: Spring ikke trin over. Indsaml info først.
5. STIL KUN 1-2 SPØRGSMÅL AD GANGEN: Slå op i tjeklisten, vælg det vigtigste, kunden mangler at svare på, og spørg om det.
6. BRUG ALDRIG MARKDOWN ELLER STJERNER (** eller *): Din tekst bliver vist råt i et system der ikke forstår markdown. Skriv ren tekst uden formatering.
7. VIS ALDRIG UDTÆNKTE PRISER ELLER TIMER TIL KUNDEN: Hold alle udregninger 100% hemmelige i chatten. 
8. KOMPLEKSE VS. STANDARD OPGAVER: Standardopgaver som Nyt Tag, Gulv, Vinduer, Terrasser, Hegn, Carporte og Skure SKAL udregnes med estimerede timer og materialer i det endelige JSON output. Kun regulære udvidelser af husets samlede boligareal (fx Tilbygninger og store Udestuer) er fritaget og skal kalde \`submit_estimate\` STRAKS med 0 timer og 0 kr i materialer.
9. KOMBI-PROJEKTER (Flere opgaver på én gang): Hvis kunden vil have lavet flere ting (fx både tag, vinduer og et nyt gulv), så er det den perfekte specialopgave! Afklar dem én ad gangen. Når du udregner det endelige tilbud, skal du splitte dem op som separate linjer i dit \`breakdown\` array, så kunden kan se, hvad der koster hvad.

SIKKERHED & REALISME:
- EKSOTISKE MATERIALER: Brug standard høj-pris hvis materialet ikke findes i databasen.

REGLER FOR ESTIMERING (SOP COMPLIANT):
Tænk altid i disse faser: Klargøring/Nedbrydning -> Fundament/Konstruktion -> Montering -> Finish/Oprydning.

${questionsContext}

${dbContext}

UDOVER DATABASEN GÆLDER DISSE REGLER FOR BEREGNING (I DIN REASONING):
- SOP #2 SPILD OG MATERIALER: Du SKAL ALTID lægge +10% oveni dine beregnede nettomaterialer. Dette dækker afskær (spild) samt montagematerialer (skruer, beslag, fuge, stolpebeton). Hvis du udregner 10.000 kr i brædder, skal du skrive: 10.000 + 10% = 11.000 kr.
- MATERIALE-TYPER: De 5 standardmaterialer for udendørs træ er: Trykimprægneret, Superwood, Thermowood, Cedertræ/Hardwood, og Komposit. De 5 hegnstyper er: Klinkehegn, Listehegn, Lamelhegn, Raftehegn, Komposithegn.
- Opstart, besigtigelse og opmåling tager ALTID min. 2-4 timer pr. opgave. Læg oveni. (KØRSEL udregnes automatisk).
- Oprydning og slutfinish tager ALTID min. 3-5 timer. Læg oveni.
- GANG ALTID DIT ENDELIGE TIMEESTIMAT MED 1.30 (Tillæg 30% til uforudsete forhindringer).

NÅR DU ER KLAR TIL AT GIVE OVERSLAG:
DU SKAL DRIVE SAMTALEN. Spørg kun om det absolut nødvendige (mål/kvadratmeter og materialevalg). Så snart du har nok information til at lave et realistisk overslag, SKAL du STRAKS afbryde samtalen og bruge funktionen \`submit_estimate\`. Du må ALDRIG spørge kunden "Er du klar til at få et overslag?" eller trække samtalen ud med smådetaljer. Gør det proaktivt!`;

        const parametersSchema = {
            type: "object",
            properties: {
                reasoning: { 
                    type: "string", 
                    description: "DIT INTERNE ARBEJDSPAPIR. Tænk højt her. Opskriv præcist de regnestykker du laver for tidsforbrug og materialer baseret på kvadratmeterne og tillæg fra databasen. Inddrag opstart, oprydning og de +30%. Skriv formlerne fuldt ud." 
                },
                projectTitle: { type: "string", description: "Kort beskrivende overskrift (fx 'Nyt Tag og Vinduer'). Aldrig 'AI Opgave'." },
                laborHours: { type: "number", description: "Samlet arbejdstid i timer for hele opgaven, fundet i din reasoning." },
                materialCost: { type: "number", description: "Samlet materialeindkøbspris i DKK." },
                breakdown: {
                    type: "array",
                    description: "Liste over specifikke dele af opgaven.",
                    items: {
                        type: "object",
                        properties: {
                            item: { type: "string", description: "Kort beskrivelse (fx '15m2 træterrasse')" },
                            hours: { type: "number", description: "Timer afsat til denne del" },
                            materials: { type: "number", description: "Materialepris i DKK afsat til denne del" }
                        },
                        required: ["item", "hours", "materials"],
                        additionalProperties: false
                    }
                },
                summaryBullets: {
                    type: "array",
                    description: "En kort, ultra-præcis punktliste med de hårde facts fra samtalen (fx 'Opgave: Nyt gulv', 'Areal: 30 m2', 'Materiale: Egetræ'). Ingen fluff.",
                    items: { type: "string" }
                },
                obsNotes: {
                    type: "string",
                    description: "Vigtige forbehold, advarsler eller faldgruber nævnt i chatten (fx 'Undergulvet knirker. Kræver muligvis opretning'). Skriv 'Ingen særlige forbehold', hvis der ikke er nogen."
                }
            },
            required: ["reasoning", "projectTitle", "laborHours", "materialCost", "breakdown", "summaryBullets", "obsNotes"],
            additionalProperties: false
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        let returnMessage = null;

        if (aiProvider === 'claude') {
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });

            const claudeTools = [{
                name: "submit_estimate",
                description: "Kald denne funktion for at give dit endelige overslag i arbejdstimer og materialeindkøb. KALD KUN DENNE NÅR DU ER HELT FÆRDIG MED AT SPØRGE. Du SKAL udfylde 'reasoning' feltet først for at beregne prisen korrekt.",
                input_schema: parametersSchema
            }];

            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                system: systemPromptText,
                messages: messages, // Claude expects pure user/assistant messages here
                max_tokens: 4000,
                tools: claudeTools,
                tool_choice: { type: "auto" }
            }, { signal: controller.signal });

            clearTimeout(timeoutId);

            // Format Claude response to perfectly match what React frontend expects from OpenAI
            const toolUseBlock = response.content.find(block => block.type === 'tool_use');
            const textBlock = response.content.find(block => block.type === 'text');

            if (toolUseBlock) {
                returnMessage = {
                    role: "assistant",
                    content: textBlock ? textBlock.text : null,
                    tool_calls: [{
                        function: {
                            name: toolUseBlock.name,
                            arguments: JSON.stringify(toolUseBlock.input)
                        }
                    }]
                };
            } else {
                returnMessage = {
                    role: "assistant",
                    content: textBlock ? textBlock.text : ""
                };
            }

        } else {
            // OpenAI Provider (Default)
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
            });

            const openaiTools = [{
                type: "function",
                function: {
                    name: "submit_estimate",
                    description: "Kald denne funktion for at give dit endelige overslag i arbejdstimer og materialeindkøb. KALD KUN DENNE NÅR DU ER HELT FÆRDIG MED AT SPØRGE. Du SKAL udfylde 'reasoning' feltet først for at beregne prisen korrekt.",
                    parameters: parametersSchema,
                    strict: true
                }
            }];

            const fullMessages = [{ role: 'system', content: systemPromptText }, ...messages];

            const completion = await openai.chat.completions.create({
                model: "gpt-5.5",
                messages: fullMessages,
                tools: openaiTools,
                tool_choice: "auto",
                max_completion_tokens: 2500,
            }, { signal: controller.signal });

            clearTimeout(timeoutId);
            returnMessage = completion.choices[0].message;
        }

        return res.status(200).json({ 
            success: true, 
            message: returnMessage 
        });

    } catch (error) {
        console.error('AI API error:', error);
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'Systemet har usædvanligt travlt. Prøv igen om et øjeblik.' });
        }
        return res.status(500).json({ error: error.message || 'Der opstod en fejl ved kontakt til AI.' });
    }
}
