import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const maxDuration = 60; // Tillad op til 60 sekunders eksekveringstid

const MAX_MESSAGES = 30; // Max 30 beskeder for at forhindre misbrug og limitere token-forbrug

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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
        
        // Tjek om grænsen er nået (for at beskytte mod uendelige chats / misbrug)
        // 'messages' indeholder kun bruger og assistent beskeder nu
        if (messages.length >= MAX_MESSAGES) {
            return res.status(200).json({
                success: true,
                message: {
                    role: 'assistant',
                    content: 'For at sikre præcisionen af vores tilbud, kan jeg desværre ikke håndtere flere beskeder i denne samtale. Du kan trykke på knappen for at gå videre med det vi har, eller ringe direkte til os for yderligere rådgivning omkring dit projekt!'
                }
            });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
        });

        // Hent data fra klienten sikkert
        const dbContext = contextData?.dbContext || '';
        const questionsContext = contextData?.questionsContext || '';
        const carpenterName = contextData?.carpenterInfo?.owner_name?.split(' ')[0] || 'Tømreren';
        const carpenterCompany = contextData?.carpenterInfo?.company_name || 'Tømrervirksomhed';

        // BYG SYSTEM PROMPTEN SIKKERT PÅ SERVEREN (Beskytter mod Prompt Injection)
        const systemPrompt = {
            role: 'system',
            content: `Du er en dygtig, realistisk og erfaren AI-assistent, der arbejder for den danske tømrer ${carpenterName} fra firmaet ${carpenterCompany}.
Din opgave er at afklare kundens specialopgave på vegne af tømreren, så systemet kan udregne et vejledende overslag (aldrig et bindende tilbud).
Mange AI'er underestimerer byggeopgaver kraftigt. DU SKAL VÆRE REALISTISK OG TÆNKE PÅ ALLE ARBEJDSGANGE!

GUARDRAILS & REGLER FOR SAMTALEN:
1. Vær professionel, kortfattet og imødekommende. Skriv på dansk.
2. Afvis off-topic spørgsmål høfligt: Hvis kunden spørger om emner, der intet har med tømrerarbejde, byggeri, materialer eller opgaven at gøre (fx "skriv et digt", "hvad er hovedstaden i frankrig"), SKAL DU AFVISE DEM høfligt og lede samtalen tilbage til projektet.
3. RÅDGIVNING: Du må gerne rådgive om træsorter, byggeprocesser osv. Brug din faglige viden som "forlænget arm" for tømreren, men hold fokus på opgaven.
4. GIV ALDRIG HURTIGE ESTIMATER: Spring ikke trin over. Indsaml info først.
5. STIL KUN 1-2 SPØRGSMÅL AD GANGEN: Slå op i tjeklisten, vælg det vigtigste, kunden mangler at svare på, og spørg om det.
6. BRUG ALDRIG MARKDOWN ELLER STJERNER (** eller *): Din tekst bliver vist råt i et system der ikke forstår markdown. Skriv ren tekst uden formatering.
7. VIS ALDRIG UDTÆNKTE PRISER ELLER TIMER TIL KUNDEN: Hold alle udregninger 100% hemmelige i chatten. 
8. TILBYGNINGER & KOMPLEKSE BYGGERIER (VIGTIGT!): Hvis kunden spørger om en tilbygning, anneks eller stor ombygning: DU MÅ IKKE give et prisestimat. Du MÅ IKKE regne på det. Sig blot: "At bygge en tilbygning er et spændende, men komplekst projekt! Det kræver altid en fysisk besigtigelse og ingeniørberegninger for at kunne give en pris. Beskriv blot jeres drømme og tanker kort, så sørger jeg for, at vi ringer jer op." Når kunden har svaret, kald \`submit_estimate\` STRAKS med 0 timer og 0 kr i materialer.

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
Når du er HELT sikker på at have al info til at regne et overslag ud, skal du bruge funktionen \`submit_estimate\`. Du skal IKKE spørge om lov først.`
        };

        // BYG VÆRKTØJET PÅ SERVEREN (Sikrer 'reasoning' feltet for "Chain of Thought" udregninger)
        const tools = [
            {
                type: "function",
                function: {
                    name: "submit_estimate",
                    description: "Kald denne funktion for at give dit endelige overslag i arbejdstimer og materialeindkøb. KALD KUN DENNE NÅR DU ER HELT FÆRDIG MED AT SPØRGE. Du SKAL udfylde 'reasoning' feltet først for at beregne prisen korrekt.",
                    parameters: {
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
                    },
                    strict: true
                }
            }
        ];

        // Indsæt system prompten forrest i message arrayet sikkert!
        const fullMessages = [systemPrompt, ...messages];

        // 55 sekunders timeout for at undgå Vercel 504 Gateway Timeout (og give et pænt svar i stedet)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: fullMessages,
                tools: tools,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 2500,
            }, { signal: controller.signal });
            
            clearTimeout(timeoutId);

            return res.status(200).json({ 
                success: true, 
                message: completion.choices[0].message 
            });
        } catch (apiError) {
            clearTimeout(timeoutId);
            if (apiError.name === 'AbortError') {
                return res.status(504).json({ error: 'Systemet har usædvanligt travlt. Prøv igen om et øjeblik.' });
            }
            throw apiError; // Giv den videre til den ydre catch-blok
        }

    } catch (error) {
        console.error('OpenAI API error:', error);
        return res.status(500).json({ error: error.message || 'Der opstod en fejl ved kontakt til AI.' });
    }
}
