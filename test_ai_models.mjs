import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env' });
dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const systemPrompt = `Du er en dygtig, realistisk og erfaren AI-assistent, der arbejder for den danske tømrer Mads fra firmaet Mads Byg.
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
8. KOMPLEKSE VS. STANDARD OPGAVER: Standardopgaver og kombinationer (fx Nyt Tag, Gulv og 3 Vinduer) SKAL udregnes med estimerede timer og materialer i det endelige JSON output. Hvis et projekt (eller kombinationen af projekter) er så avanceret, at det kræver vurdering af bærende konstruktioner (fx fjerne vægge), byggetilladelser, dybdegående el/vvs arbejde, eller kunden ønsker en totalrenovering uden at kende omfanget, SKAL du stoppe. Du skal straks kalde \`submit_estimate\` med laborHours = 0 og materialCost = 0. I dit resumé (summaryBullets) skal du skrive: 'Komplekst projekt: Kræver fysisk besigtigelse'.
9. KOMBI-PROJEKTER (Flere opgaver på én gang): Hvis kunden vil have lavet flere ting (fx både tag, vinduer og et nyt gulv), så er det den perfekte specialopgave! Afklar dem én ad gangen. Når du udregner det endelige tilbud, skal du splitte dem op som separate linjer i dit \`breakdown\` array, så kunden kan se, hvad der koster hvad.

NÅR DU ER KLAR TIL AT GIVE OVERSLAG:
DU SKAL DRIVE SAMTALEN. Spørg kun om det absolut nødvendige (mål/kvadratmeter og materialevalg). Så snart du har nok information til at lave et realistisk overslag, SKAL du STRAKS afbryde samtalen og bruge funktionen \`submit_estimate\`. Du må ALDRIG spørge kunden "Er du klar til at få et overslag?" eller trække samtalen ud med smådetaljer. Gør det proaktivt!`;

const parametersSchema = {
    type: "object",
    properties: {
        reasoning: { type: "string" },
        projectTitle: { type: "string" },
        laborHours: { type: "number" },
        materialCost: { type: "number" },
        breakdown: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    item: { type: "string" },
                    hours: { type: "number" },
                    materials: { type: "number" }
                },
                required: ["item", "hours", "materials"]
            }
        },
        summaryBullets: { type: "array", items: { type: "string" } },
        obsNotes: { type: "string" }
    },
    required: ["reasoning", "projectTitle", "laborHours", "materialCost", "breakdown", "summaryBullets", "obsNotes"]
};

const anthropicToolSchema = {
    name: "submit_estimate",
    description: "Submit a price estimate with internal reasoning.",
    input_schema: parametersSchema
};

const openaiToolSchema = {
    type: "function",
    function: {
        name: "submit_estimate",
        description: "Submit a price estimate with internal reasoning.",
        parameters: parametersSchema
    }
};

const scenarios = [
    {
        name: "Case 1: Den perfekte kunde (Hurtig tilbud)",
        prompt: "Hej Mads Byg. Jeg skal have lagt 40 kvadratmeter lamelparket i stuen. Der er ingen fodlister der skal skiftes, og det skal bare lægges direkte oven på det eksisterende plant trægulv."
    },
    {
        name: "Case 2: Den forvirrede kunde (Guidance needed)",
        prompt: "Vi vil gerne have kigget på taget, det er vist lidt utæt nogle steder. Og måske vil vi have nogle nye vinduer på et tidspunkt. Kan du regne det ud?"
    },
    {
        name: "Case 3: Kombi-kunden (Flere projekter)",
        prompt: "Jeg skal have sat 15 meter bræddehegn op i skellet til naboen, og så skal jeg have bygget et lille skur på 10 kvm ved siden af."
    },
    {
        name: "Case 4: Den umulige opgave (Besigtigelse kræves)",
        prompt: "Vi vil rive den bærende væg ned mellem køkken og stue for at lave køkkenalrum, og så skal der lægges nye bjælker ind."
    }
];

async function testAnthropic(messages) {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 1500,
            system: systemPrompt,
            messages: messages,
            tools: [anthropicToolSchema]
        });

        const toolCall = response.content.find(block => block.type === 'tool_use');
        if (toolCall) {
            return `[TOOL CALL: submit_estimate]\nLabor: ${toolCall.input.laborHours}t, Materialer: ${toolCall.input.materialCost}kr\nReasoning: ${toolCall.input.reasoning.substring(0, 150)}...`;
        }
        
        const textBlock = response.content.find(block => block.type === 'text');
        return `[CHAT RESPONSE]\n${textBlock?.text || ''}`;
    } catch (e) { return "ERROR: " + e.message; }
}

async function testOpenAI(messages) {
    try {
        const oaiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: oaiMessages,
            tools: [openaiToolSchema],
            tool_choice: "auto",
            temperature: 0.7
        });

        const msg = response.choices[0].message;
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            const args = JSON.parse(msg.tool_calls[0].function.arguments);
            return `[TOOL CALL: submit_estimate]\nLabor: ${args.laborHours}t, Materialer: ${args.materialCost}kr\nReasoning: ${args.reasoning.substring(0, 150)}...`;
        }

        return `[CHAT RESPONSE]\n${msg.content || ''}`;
    } catch (e) { return "ERROR: " + e.message; }
}

async function run() {
    let mdOutput = "# A/B Test Rapport: OpenAI vs Claude\n\n";
    
    for (const s of scenarios) {
        console.log(`Running ${s.name}...`);
        mdOutput += `## ${s.name}\n`;
        mdOutput += `**Kunde:** "${s.prompt}"\n\n`;
        
        const messages = [{ role: 'user', content: s.prompt }];
        
        const oaiRes = await testOpenAI(messages);
        const antRes = await testAnthropic(messages);
        
        mdOutput += `### 🔵 OpenAI (GPT-4o)\n` + oaiRes.replace(/\n/g, '\n> ') + `\n\n`;
        mdOutput += `### 🟠 Anthropic (Claude 3.5)\n` + antRes.replace(/\n/g, '\n> ') + `\n\n`;
        mdOutput += `---\n\n`;
    }
    
    fs.writeFileSync('/Users/madsbrunsbjergchristensen/.gemini/antigravity/brain/3305ba4d-0f78-4f8e-a3b1-6c3cf4aa3a28/claude_ab_test_results.md', mdOutput);
    console.log("Done!");
}

run();
