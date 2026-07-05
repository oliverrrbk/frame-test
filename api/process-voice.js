import { MATERIAL_INDEX, WORK_FORMULAS } from '../src/prices.js';
import { WHISPER_PROMPT, FAGTERMER_TEXT, FAGTERM_CORRECTION_PROMPT } from '../src/utils/fagtermer.js';

export const config = {
    runtime: 'edge'
};

// Verificér kalderens Supabase-JWT (edge-runtime → ingen node-req; brug auth REST).
// Uden dette var funktionen en åben OpenAI-proxy (uautoriseret omkostnings-misbrug).
async function verifyUser(req) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    const url = process.env.VITE_SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    try {
        const r = await fetch(`${url}/auth/v1/user`, {
            headers: { apikey: anon, Authorization: `Bearer ${token}` }
        });
        if (!r.ok) return null;
        const u = await r.json();
        return u?.id ? u : null;
    } catch {
        return null;
    }
}

// Letvægts rate-limit pr. bruger via Upstash (no-op'er hvis Upstash ikke er sat op).
async function rateLimitEdge(userId, limit = 120, windowSec = 3600) {
    const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!URL || !TOKEN) return true;
    try {
        const key = `rl:process-voice:${userId}`;
        const res = await fetch(`${URL}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(windowSec), 'NX']])
        });
        if (!res.ok) return true;
        const data = await res.json();
        const count = Array.isArray(data) ? Number(data[0]?.result) : 0;
        return !Number.isFinite(count) || count <= limit;
    } catch {
        return true;
    }
}

const jsonError = (msg, status) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });

// Transskribér lyd med den bedste tilgængelige model + dansk fag-ordliste som hint.
// Prøver gpt-4o-transcribe (mest præcis) og falder tilbage til whisper-1, så det
// altid virker — også hvis den nye model ikke er slået til på kontoen.
async function transcribeAudio(audioFile, apiKey) {
    const models = ['gpt-4o-transcribe', 'whisper-1'];
    let lastErr = '';
    for (const model of models) {
        const fd = new FormData();
        fd.append('file', audioFile, 'recording.webm');
        fd.append('model', model);
        fd.append('language', 'da');
        fd.append('prompt', WHISPER_PROMPT);
        const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: fd
        });
        if (resp.ok) {
            const data = await resp.json();
            console.log(`Transcribed with ${model}`);
            return data.text;
        }
        lastErr = await resp.text();
        console.error(`Transcription failed with ${model}:`, lastErr);
    }
    throw new Error(`Whisper API Error: ${lastErr}`);
}

// Let efter-rettelse: retter KUN fejlhørte danske fagtermer i den rå diktering.
// Fejler aldrig flowet — returnerer den oprindelige tekst ved problemer.
async function correctFagtermer(text, apiKey) {
    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-5.5',
                messages: [
                    { role: 'system', content: FAGTERM_CORRECTION_PROMPT },
                    { role: 'user', content: text }
                ]
            })
        });
        if (!resp.ok) return text;
        const data = await resp.json();
        const corrected = data.choices?.[0]?.message?.content?.trim();
        return corrected || text;
    } catch (e) {
        console.error('Fagterm-rettelse fejlede:', e);
        return text;
    }
}

// Strukturér en fritalt aftaleseddel fra en tømrer til felterne i Aftalesedler-modalen.
// Tømreren taler frit ("vi sætter to ekstra spots op i køkkenet, ca. 2 timer plus
// materialer") og vi udfylder titel, beskrivelse, pristype og beløb/estimat, så han
// blot skal rette efter. Fejler aldrig flowet — returnerer tomme felter ved problemer.
async function structureAftaleseddel(text, apiKey) {
    const systemPrompt = `Du er assistent for en dansk tømrer, der står ude hos en kunde og indtaler en aftaleseddel om EKSTRAARBEJDE.
Du modtager en transskriberet talebesked og skal udfylde felterne i aftalesedlen.

Vigtige danske byggefagtermer (forstå dem korrekt, og ret fejlhørte varianter):
${FAGTERMER_TEXT}

Returnér KUN et JSON-objekt med denne struktur:
{
  "title": "Kort, præcis titel på ekstraarbejdet (fx 'Montering af 2 ekstra spots i køkken'). Max ca. 60 tegn.",
  "description": "En klar, professionel beskrivelse af hvad der er aftalt, i hele sætninger. Ret stavefejl og fagtermer.",
  "priceType": "fast_pris ELLER efter_regning",
  "amount": "Hvis fast_pris: KUN tallet i kroner uden tusindtalsseparator og uden 'kr' (fx '3500'). Hvis efter_regning: et kort estimat i fri tekst (fx 'Ca. 2 timer + materialer')."
}

Regler:
- Vælg "fast_pris" KUN hvis tømreren tydeligt nævner et fast beløb/en fast pris. Ellers vælg "efter_regning".
- Hvis intet beløb eller estimat nævnes, sæt "amount" til "" (tom streng).
- Gæt aldrig en fast pris hvis den ikke er nævnt.
- Skriv på dansk. Returnér KUN JSON.`;

    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-5.5',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]
            })
        });
        if (!resp.ok) {
            console.error('Aftaleseddel-strukturering fejlede:', await resp.text());
            return { title: '', description: text, priceType: 'efter_regning', amount: '' };
        }
        const data = await resp.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        return {
            title: parsed.title || '',
            description: parsed.description || text,
            priceType: parsed.priceType === 'fast_pris' ? 'fast_pris' : 'efter_regning',
            amount: parsed.amount != null ? String(parsed.amount) : ''
        };
    } catch (e) {
        console.error('Aftaleseddel-strukturering fejl:', e);
        // Fald tilbage til den rå tekst som beskrivelse, så intet går tabt.
        return { title: '', description: text, priceType: 'efter_regning', amount: '' };
    }
}

// Udfyld felterne i "Hurtigt tilbud" ud fra fri tale. Ren hjælpende hånd:
// fylder KUN de felter, tømreren nævner — tilføjer intet ekstra (ingen materialeliste,
// ingen opdigtede priser). Fejler aldrig flowet — returnerer tomme felter ved problemer.
async function structureQuickQuote(text, apiKey) {
    const systemPrompt = `Du er assistent for en dansk tømrer, der opretter et hurtigt tilbud og indtaler oplysningerne frit.
Du modtager en transskriberet talebesked og skal udtrække DE FELTER, der nævnes — og KUN dem.

Vigtige danske byggefagtermer (forstå dem korrekt, og ret fejlhørte varianter):
${FAGTERMER_TEXT}

Returnér KUN et JSON-objekt med denne struktur (udelad intet — men brug tom streng "" for felter der IKKE nævnes):
{
  "customerName": "Kundens navn, hvis nævnt. Ellers ''.",
  "phone": "Telefonnummer (kun cifre/mellemrum), hvis nævnt. Ellers ''.",
  "email": "Email, hvis nævnt. Ellers ''.",
  "address": "Gade + husnummer, hvis nævnt. Ellers ''.",
  "zip": "Postnummer (4 cifre), hvis nævnt. Ellers ''.",
  "city": "By, hvis nævnt. Ellers ''.",
  "customerType": "'erhverv' hvis der nævnes firma/CVR/erhverv, 'privat' hvis privatkunde, ellers ''.",
  "cvr": "CVR-nummer (kun cifre), hvis nævnt. Ellers ''.",
  "title": "Kort opgavetitel ud fra opgaven (fx 'Nyt trægulv i stue'). Max ca. 60 tegn. Ellers ''.",
  "workDescription": "En klar, professionel arbejdsbeskrivelse i hele sætninger ud fra det sagte. Ret stavefejl og fagtermer. Ellers ''.",
  "fixedPrice": "Hvis en fast pris nævnes: KUN tallet i kroner uden tusindtalsseparator og uden 'kr' (fx '30000'). Ellers ''.",
  "validityDays": "Antal dage tilbuddet er gyldigt, hvis nævnt (kun tal). Ellers ''."
}

Regler:
- Udfyld ALDRIG et felt, der ikke er nævnt — brug "".
- Gæt aldrig en pris, et CVR eller kontaktoplysninger, der ikke er sagt.
- Tilføj IKKE materialeliste, ekstra arbejde eller andet. Kun ren udtrækning.
- Skriv på dansk. Returnér KUN JSON.`;

    const empty = { customerName: '', phone: '', email: '', address: '', zip: '', city: '', customerType: '', cvr: '', title: '', workDescription: '', fixedPrice: '', validityDays: '' };
    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-5.5',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]
            })
        });
        if (!resp.ok) {
            console.error('Quick-quote-strukturering fejlede:', await resp.text());
            return { ...empty, workDescription: text };
        }
        const data = await resp.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        return { ...empty, ...parsed };
    } catch (e) {
        console.error('Quick-quote-strukturering fejl:', e);
        return { ...empty, workDescription: text };
    }
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    // Kræv en gyldig, indlogget bruger + rate-limit (lukker den åbne OpenAI-proxy).
    const user = await verifyUser(req);
    if (!user) return jsonError('Ikke autoriseret', 401);
    if (!(await rateLimitEdge(user.id))) return jsonError('For mange forespørgsler. Prøv igen om lidt.', 429);

    try {
        const formData = await req.formData();
        const mode = formData.get('mode'); // 'transcribe', 'structure', or undefined
        let transcription = '';

        if (mode === 'structure') {
            transcription = formData.get('text');
            if (!transcription) {
                return new Response(JSON.stringify({ error: 'No text provided for structure mode' }), { status: 400 });
            }
        } else {
            const audioFile = formData.get('audio');
            if (!audioFile) {
                return new Response(JSON.stringify({ error: 'No audio file provided' }), { status: 400 });
            }

            // 1. Transskribér lyd (bedste model + dansk fag-ordliste som hint)
            console.log('Sending to transcription API...');
            transcription = await transcribeAudio(audioFile, process.env.OPENAI_API_KEY);
            console.log('Transcription:', transcription);

            if (!transcription || transcription.trim() === '') {
                return new Response(JSON.stringify({
                    title: 'Tom lydfil',
                    notes: 'Der blev ikke registreret noget tale. Prøv igen.',
                    phases: [{ name: 'Generelt', hours: 0, materials: [] }]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            // Kun transskribering (log-diktering): ret fagtermer og returnér ren tekst.
            if (mode === 'transcribe') {
                const corrected = await correctFagtermer(transcription, process.env.OPENAI_API_KEY);
                return new Response(JSON.stringify({ transcription: corrected }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Aftaleseddel-diktering: ret fagtermer og strukturér i titel/beskrivelse/pris.
            if (mode === 'aftaleseddel') {
                const corrected = await correctFagtermer(transcription, process.env.OPENAI_API_KEY);
                const structured = await structureAftaleseddel(corrected, process.env.OPENAI_API_KEY);
                return new Response(JSON.stringify({ transcription: corrected, ...structured }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Hurtigt tilbud-diktering: ret fagtermer og udfyld tilbuds-felterne.
            if (mode === 'quickfill') {
                const corrected = await correctFagtermer(transcription, process.env.OPENAI_API_KEY);
                const fields = await structureQuickQuote(corrected, process.env.OPENAI_API_KEY);
                return new Response(JSON.stringify({ transcription: corrected, ...fields }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 2. Process text using GPT-5.5 (if mode is structure, or if no mode was provided)
        const systemPrompt = `
Du er en AI byggelederassistent.
Opgaven: Du modtager en transskriberet talebesked fra en tømrer/håndværker, der har optaget noter fra en kundesag.
Din opgave er at trække de vigtige oplysninger ud og returnere dem som et JSON-objekt.

VIGTIGT:
Her er tømrerens tilgængelige database over materialer:
${JSON.stringify(MATERIAL_INDEX)}

Og her er hans standard formler for tidsforbrug:
${JSON.stringify(WORK_FORMULAS)}

Vigtige danske byggefagtermer (forstå dem korrekt, og ret fejlhørte/fejlstavede varianter i transskriptionen til disse):
${FAGTERMER_TEXT}

Instrukser:
1. Inddel arbejdet i logiske byggeetaper (Phases). F.eks. "Jord og beton", "Råhus", "Montering af vinduer", "Indvendig finish", "El/VVS".
2. Prøv at matche de materialer, håndværkeren nævner, PÅ EKSAGT NAVN OG PRIS fra databasen for hver etape.
3. Hvis han nævner et materiale, som ikke findes i databasen, så opret det som et nyt frit materiale og gæt en realistisk markedspris.
4. Estimer antallet af timer (hours) FOR HVER ETAPE. Hvis han nævner specifikke timer for en opgave, brug dem. Hvis ikke, så brug WORK_FORMULAS til at estimere det.
5. VIGTIGT: Tænk som en ægte, erfaren tømrer. Vær lige så detaljeret som en standard-beregner. Tilføj altid automatisk de nødvendige små-materialer, selvom de ikke nævnes eksplicit. Det inkluderer f.eks. fugleklodser, dampspærretape, fuge, beslag, kiler, skruer og lim, der kræves for at udføre det beskrevne arbejde professionelt.

Struktur krav til dit JSON output:
{
  "title": "Kort og præcis titel på opgaven, f.eks. 'Tilbygning 40 m2'",
  "notes": "Et resumé af alle detaljerne til intern brug og til kundens tilbud, skrevet professionelt.",
  "global_costs": {
    "containers": <antal containere (heltal) for affald/deponi, fx 1 eller 2, hvis nævnt. Ellers 0>,
    "scaffolding": <beløb (tal) for lift/stilladsleje hvis nævnt, fx 5000. Ellers 0>,
    "invisible_materials": <beløb (tal) for skruer, fuge, lim, beslag, kiler eller slitage, fx 1500. Ellers 0>,
    "transport_hours": <transporttid/kørsel i antal timer, fx 2. Ellers 0>
  },
  "phases": [
    {
      "name": "Etapens navn (f.eks. 'Etape 1: Råhus og tag')",
      "hours": <estimerede timer for KUN denne etape>,
      "materials": [
        {
          "name": "Materialets navn (helst et eksakt match fra databasen)",
          "quantity": <tal>,
          "unit": "stk, m2, lm, eller timer",
          "price": <indkøbspris pr enhed (tal) ud fra databasen>
        }
      ]
    }
  ]
}

- Du må KUN returnere JSON.
- Ret eventuelle stavefejl i transskriptionen.
- Hvis et materiale nævnes uden mængde, sæt quantity til 1.
- ADVARSEL: Undgå dobbeltkonfekt. Hvis en container eller stilladsleje puttes ind under 'global_costs', må den IKKE også oprettes som et materiale inde i en etape.
`;

        console.log('Sending to GPT-5.5...');
        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-5.5',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcription }
                ]
            })
        });

        if (!gptResponse.ok) {
            const errorText = await gptResponse.text();
            console.error('GPT API Error:', errorText);
            throw new Error(`GPT API Error: ${gptResponse.statusText}`);
        }

        const gptData = await gptResponse.json();
        const gptText = gptData.choices[0].message.content;
        
        console.log('GPT-5.5 response:', gptText);

        // Pars JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(gptText);
        } catch (e) {
            console.error('Failed to parse GPT JSON', e);
            parsedResult = {
                title: 'Kunne ikke strukturere',
                notes: transcription,
                phases: [
                    {
                        name: 'Generelt',
                        hours: 0,
                        materials: []
                    }
                ]
            };
        }

        // Return combined data
        return new Response(JSON.stringify({
            transcription: transcription,
            ...parsedResult
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Process Voice Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
