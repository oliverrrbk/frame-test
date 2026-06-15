import { MATERIAL_INDEX, WORK_FORMULAS } from '../src/prices.js';

export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

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

            // 1. Transcribe audio using OpenAI Whisper
            const whisperFormData = new FormData();
            whisperFormData.append('file', audioFile, 'recording.webm');
            whisperFormData.append('model', 'whisper-1');
            whisperFormData.append('language', 'da');

            console.log('Sending to Whisper API...');
            const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: whisperFormData
            });

            if (!whisperResponse.ok) {
                const errorText = await whisperResponse.text();
                console.error('Whisper API Error:', errorText);
                throw new Error(`Whisper API Error: ${whisperResponse.statusText}`);
            }

            const whisperData = await whisperResponse.json();
            transcription = whisperData.text;
            console.log('Transcription:', transcription);

            if (!transcription || transcription.trim() === '') {
                return new Response(JSON.stringify({ 
                    title: 'Tom lydfil', 
                    notes: 'Der blev ikke registreret noget tale. Prøv igen.', 
                    phases: [{ name: 'Generelt', hours: 0, materials: [] }] 
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            // Return immediately if only transcribing
            if (mode === 'transcribe') {
                return new Response(JSON.stringify({ transcription }), { 
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
