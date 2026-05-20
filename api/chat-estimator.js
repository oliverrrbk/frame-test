import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { applyCors } from './_cors.js';
import { rateLimit } from './_ratelimit.js';
import { QUESTIONS } from '../src/components/Wizard/questionsConfig.js';

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

        const aiProvider = process.env.AI_PROVIDER || 'claude';

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
5. KOM IGENNEM HELE TJEKLISTEN: Stil gerne 2-3 spørgsmål ad gangen for at holde fremdrift i samtalen. DU SKAL indsamle svar på ALLE de punkter, der findes i tjeklisten for den pågældende kategori. Ignorer aldrig et punkt fra tjeklisten, da hvert svar påvirker prisen præcist.
6. BRUG ALDRIG MARKDOWN ELLER STJERNER (** eller *): Din tekst bliver vist råt i et system der ikke forstår markdown. Skriv ren tekst uden formatering.
7. VIS ALDRIG UDTÆNKTE PRISER ELLER TIMER TIL KUNDEN: Hold alle udregninger 100% hemmelige i chatten. 
8. KOMPLEKSE VS. STANDARD OPGAVER: Standardopgaver og kombinationer (fx Nyt Tag, Gulv og 3 Vinduer) SKAL udregnes med estimerede timer og materialer i det endelige JSON output. Hvis et projekt (eller kombinationen af projekter) er så avanceret, at det kræver vurdering af bærende konstruktioner (fx fjerne vægge), byggetilladelser, dybdegående el/vvs arbejde, eller kunden ønsker en totalrenovering uden at kende omfanget, SKAL du stoppe. Du skal straks kalde \`submit_estimate\` med laborHours = 0 og materialCost = 0. I dit resumé (summaryBullets) skal du skrive: 'Komplekst projekt: Kræver fysisk besigtigelse'.
9. KOMBI-PROJEKTER (Flere opgaver på én gang): Hvis kunden vil have lavet flere ting (fx både tag, vinduer og et nyt gulv), så er det den perfekte specialopgave! Afklar dem én ad gangen. Når du udregner det endelige tilbud, skal du splitte dem op som separate linjer i dit \`breakdown\` array, så kunden kan se, hvad der koster hvad.

SIKKERHED & REALISME:
- EKSOTISKE MATERIALER: Brug standard høj-pris hvis materialet ikke findes i databasen.

REGLER FOR ESTIMERING (SOP COMPLIANT):
Tænk altid i disse faser for realistiske timer: Klargøring/Nedbrydning -> Fundament/Underkonstruktion (Tager ofte ligeså lang tid som selve overfladen!) -> Montering -> Finish/Oprydning. Husk også at medregne kørsel.

${questionsContext}

${dbContext}

UDOVER DATABASEN GÆLDER DISSE REGLER FOR BEREGNING (I DIN REASONING):
- BRUG DATABASEN PRÆCIST: Du har fået udleveret Tidsforbrug (WORK_FORMULAS) og Materialepriser. Du SKAL kombinere dem! Fx for et gulv skal du lægge 'hoursPerUnit' (selve lægningen) sammen med 'levelingHours' (opretning) og 'disposalHours' (nedrivning). For terrasser skal du tilføje 'groundFoundationHours' (fundament) og 'hiddenFasteningHours' til den normale timepris pr m2. Gør det for alle valgte faser!
- HUSK ALLE MATERIALER: Du må ikke kun udregne prisen for overfladen (fx træbrædder). Du skal også slå prisen op for fundament, skruer, underpap, fuge osv., hvis opgaven kræver det.
- SPILD OG TILLÆG: Du skal KUN udregne de RENE netto-timer og RENE netto-materialepriser for selve udførelsen! Systemet har en indbygget sikkerhedsbuffer (ca. 5-15.000 kr.) samt en 15% indkøbsavance på materialer, som lægges oveni dit resultat. Hold dine timer og priser strictly netto. Hvis opgaven kræver afskær (fx gulv/terrasse), skal du bare regne det med i dit netto-materialeestimat.
- MATERIALE-TYPER: De 5 standardmaterialer for udendørs træ er: Trykimprægneret, Superwood, Thermowood, Cedertræ/Hardwood, og Komposit. De 5 hegnstyper er: Klinkehegn, Listehegn, Lamelhegn, Raftehegn, Komposithegn.

NÅR DU ER NÅET IGENNEM HELE TJEKLISTEN:
Når kunden har svaret på alle relevante punkter i din tjekliste, SKAL du proaktivt afbryde samtalen og kalde den korrekte funktion.
VIGTIGT OM KOMBI-OPGAVER: Hvis kunden beder om et projekt, der spænder over FLERE forskellige kategorier på én gang (fx både tag og vinduer, eller gulv og loft), må du ALDRIG bruge standard-værktøjerne. Du SKAL i stedet betragte det som en samlet 'Specialopgave' og kalde værktøjet \`submit_estimate\`.
Hvis projektet er ÉN ENKELT standard-kategori fra Tjeklisten (fx KUN roof, eller KUN floor), SKAL du kalde det tilsvarende værktøj (fx \`calculate_roof\`) og overlevere svarene som struktureret data.
Hvis projektet IKKE findes i tjeklisten (en ægte specialopgave, fx bygning af en udestue), skal du bruge \`submit_estimate\` og selv udregne timer og materialer ud fra din viden!
Du må ALDRIG gætte dig til svarene på tjeklisten – spørg altid kunden!`;

        const submitEstimateSchema = {
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
                            item: { type: "string", description: "Beskrivende tekst af arbejdsfasen (fx 'Opbygning af bærende konstruktion', 'Montering af 30m2 hårdttræ' eller 'Kørsel, brug af værktøj samt grov-oprydning'). Gør dem detaljerede!" },
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

        
        
function getDynamicTools(provider) {
    const tools = [];
    for (const [category, questions] of Object.entries(QUESTIONS)) {
        if (category === 'special') continue;
        
        const properties = {};
        for (const q of questions) {
            if (q.type === 'file' || q.type === 'window_configurator') continue;
            const prop = { description: q.label };
            if (q.type === 'number') {
                prop.type = 'number';
            } else if (q.type === 'checkbox') {
                prop.type = 'boolean';
            } else {
                prop.type = 'string';
                if (q.options && q.options.length > 0) {
                    prop.enum = q.options.map(opt => typeof opt === 'string' ? opt : opt.label);
                }
            }
            properties[q.id] = prop;
        }

        const schema = {
            type: "object",
            properties: {
                formState: {
                    type: "object",
                    properties: properties,
                    additionalProperties: false
                },
                summaryBullets: { type: "array", items: { type: "string" } },
                obsNotes: { type: "string" }
            },
            required: ["formState", "summaryBullets", "obsNotes"],
            additionalProperties: false
        };

        if (provider === 'claude') {
            tools.push({
                name: `calculate_${category}`,
                description: `KALD DENNE NÅR OPGAVEN ER KATEGORIEN: ${category}. Udfyld så mange felter som muligt baseret på kundens svar. Brug de eksakte svarmuligheder (enums).`,
                input_schema: schema
            });
        } else {
            tools.push({
                type: "function",
                function: {
                    name: `calculate_${category}`,
                    description: `KALD DENNE NÅR OPGAVEN ER KATEGORIEN: ${category}. Udfyld så mange felter som muligt baseret på kundens svar. Brug de eksakte svarmuligheder (enums).`,
                    parameters: schema,
                    strict: false
                }
            });
        }
    }
    return tools;
}

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        let returnMessage = null;

        if (aiProvider === 'claude') {
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });

            const claudeTools = [
                ...getDynamicTools('claude'),
                {
                    name: "submit_estimate",
                    description: "KALD KUN DENNE NÅR DET ER EN ÆGTE SPECIALOPGAVE SOM IKKE FINDES I TJEKLISTEN. Du udregner selv pris.",
                    input_schema: submitEstimateSchema
                }
            ];

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
                let toolName = toolUseBlock.name;
                let args = toolUseBlock.input;
                if (toolName.startsWith('calculate_')) {
                    args.category = toolName.split('_')[1];
                    toolName = 'calculate_standard_project';
                }
                returnMessage = {
                    role: "assistant",
                    content: textBlock ? textBlock.text : null,
                    tool_calls: [{
                        function: {
                            name: toolName,
                            arguments: JSON.stringify(args)
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

            const openaiTools = [
                ...getDynamicTools('openai'),
                {
                    type: "function",
                    function: {
                        name: "submit_estimate",
                        description: "KALD KUN DENNE NÅR DET ER EN ÆGTE SPECIALOPGAVE SOM IKKE FINDES I TJEKLISTEN. Du udregner selv pris.",
                        parameters: submitEstimateSchema,
                        strict: true
                    }
                }
            ];

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
            if (returnMessage && returnMessage.tool_calls) {
                returnMessage.tool_calls.forEach(tc => {
                    let toolName = tc.function.name;
                    if (toolName.startsWith('calculate_')) {
                        const args = JSON.parse(tc.function.arguments);
                        args.category = toolName.split('_')[1];
                        tc.function.name = 'calculate_standard_project';
                        tc.function.arguments = JSON.stringify(args);
                    }
                });
            }
        }
        // MATH VALIDATOR (Sikring af håndværkerens avance)
        if (returnMessage && returnMessage.tool_calls && returnMessage.tool_calls.length > 0) {
            const toolCall = returnMessage.tool_calls[0];
            if (toolCall.function && toolCall.function.name === 'submit_estimate') {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    
                    if (args.breakdown && Array.isArray(args.breakdown) && args.breakdown.length > 0) {
                        let sumHours = 0;
                        let sumMaterials = 0;
                        
                        args.breakdown.forEach(item => {
                            sumHours += (Number(item.hours) || 0);
                            sumMaterials += (Number(item.materials) || 0);
                        });

                        // Vi fjerner kunstige AI-tillæg (1.30 og 1.10) for at AI-chatten rammer PRÆCIS
                        // samme priser som den deterministiske lommeregner! (som selv har en hidden buffer).
                        const expectedHours = sumHours;
                        const expectedMaterials = sumMaterials;

                        // Systemet påtager sig nu ansvaret for at lægge avance/spild på AI'ens netto-tal.
                        // AI'en bedes om at outputte netto, så vi kan gøre det 100% deterministisk.
                        args.laborHours = Math.round(expectedHours);
                        args.materialCost = Math.round(expectedMaterials);
                        
                        toolCall.function.arguments = JSON.stringify(args);
                        } else if (args.breakdown && args.breakdown.length === 0 && (args.laborHours > 0 || args.materialCost > 0)) {
                            // Edge case: AI glemte breakdown linjer, men gav en total.
                            args.breakdown = [{
                                item: "Samlet overslag på opgaven",
                                hours: Math.max(0, Math.round(args.laborHours)),
                                materials: Math.max(0, Math.round(args.materialCost))
                            }];
                            toolCall.function.arguments = JSON.stringify(args);
                        }
                } catch (e) {
                    console.error("[Math Guard] Fejl under validering:", e);
                }
            }
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
        return res.status(500).json({ 
            error: error.message || 'Der opstod en fejl ved kontakt til AI.',
            debug: {
                hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
                keyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0
            }
        });
    }
}
