import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { WORK_FORMULAS } from '../../prices';
import { QUESTIONS } from './questionsConfig';

const ChatEstimator = ({ carpenter, settingsData, materialsData, onComplete }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [estimateData, setEstimateData] = useState(null); // Nyt state til at holde data indtil brugeren klikker
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Initialiser chat med System Prompt
        const initChat = async () => {
            // Formatér databasen til læselig tekst for AI'en
            let dbContext = '';
            if (materialsData) {
                dbContext += '\nLIVE MATERIALEPRISER (Rent indkøb i DKK fra databasen):\n';
                Object.entries(materialsData).forEach(([cat, items]) => {
                    dbContext += `- ${cat.toUpperCase()}: ${Object.entries(items).map(([name, price]) => `${name}: ${price} kr`).join(', ')}\n`;
                });
            }
            dbContext += '\nLIVE TIDSFORBRUG (Timer pr. enhed/m2 fra databasen):\n';
            Object.entries(WORK_FORMULAS).forEach(([cat, data]) => {
                dbContext += `- ${cat.toUpperCase()}: ${Object.entries(data).filter(([k]) => k !== 'containerThreshold').map(([k, v]) => `${k}: ${v}t`).join(', ')}\n`;
            });
            // Formatér fagspecifikke spørgsmål (Tjeklister) til AI'en
            let questionsContext = '\nFAGSPECIFIKKE TJEKLISTER (VIGTIGT!):\nHvis kunden nævner et projekt, der falder inden for en af nedenstående kategorier (fx tag, vinduer, køkken), SKAL du bruge de tilhørende spørgsmål som din interne huskeliste. Du MÅ ALDRIG give et estimat, før du har fået afklaret disse specifikke spørgsmål (spørg ind løbende, max 1-2 ad gangen):\n';
            Object.entries(QUESTIONS).forEach(([cat, questionsArray]) => {
                questionsContext += `\nKATEGORI: ${cat.toUpperCase()}\n`;
                questionsArray.forEach(q => {
                    if (q.label) {
                        questionsContext += `- ${q.label}\n`;
                    }
                });
            });

            const systemPrompt = {
                role: 'system',
                content: `Du er en dygtig, realistisk og erfaren AI-assistent, der arbejder for den danske tømrer ${carpenter?.owner_name?.split(' ')[0] || 'Tømreren'} fra firmaet ${carpenter?.company_name || 'Tømrervirksomhed'}.
Din opgave er at afklare kundens specialopgave på vegne af tømreren, så systemet kan udregne et vejledende overslag (aldrig et bindende tilbud).
Mange AI'er underestimerer byggeopgaver kraftigt. DU SKAL VÆRE REALISTISK OG TÆNKE PÅ ALLE ARBEJDSGANGE!

REGLER FOR SAMTALEN:
1. Vær professionel, kortfattet og imødekommende. Skriv på dansk.
2. Stil højst 1-2 spørgsmål ad gangen for at holde en naturlig samtale uden at overvælde kunden.
3. RÅDGIVNING: Hvis kunden er i tvivl (fx "hvilket træ er bedst?"), så brug din faglighed til at guide dem.
4. GIV ALDRIG HURTIGE ESTIMATER: Du må under ingen omstændigheder gætte eller springe trin over. Det er bedre at processen tager længere tid, end at kunden får et upræcist estimat.
5. DU SKAL FÅ SVAR PÅ ALLE PARAMETRE I TJEKLISTEN: Lige så snart du har identificeret hvilken/hvilke type opgaver kunden ønsker (fx 'hegn' og 'træterrasse'), SKAL du slå op i afsnittet "FAGSPECIFIKKE TJEKLISTER" herunder. 
- Din opgave er at sikre dig, at vi har svar på alle parametre i tjeklisten.
- VIGTIGT: Hvis kunden allerede implicit har besvaret et punkt på tjeklisten (fx hvis de skriver "jeg vil gerne have sildeben", så HAR de allerede svaret JA til "specialmønster"), så SKAL DU SPRINGE DET SPØRGSMÅL OVER! Du må ikke stille dumme spørgsmål om ting, kunden allerede har fortalt dig.
- Du må IKKE gå videre eller afgive et estimat, før du har den nødvendige viden om samtlige punkter i tjeklisten for den/de relevante kategorier.

SIKKERHED & REALISME (EKSTREME OPGAVER):
- BÆRENDE VÆGGE: Hvis kunden vil fjerne en bærende væg (og ikke har ingeniørtegninger), SKAL du gøre opmærksom på, at det kræver en ingeniørberegning før der kan gives et bindende tilbud, og at du kun kan give et groft overslag på selve arbejdet.
- KÆMPE OPGAVER: Hvis kunden nævner noget absurd stort (fx en carport på 150m2), skal du høfligt nævne, at det er usædvanligt stort, højst sandsynligt kræver byggetilladelse og ingeniør, men at du gerne regner et overslag.
- EKSOTISKE MATERIALER: Hvis kunden vil have noget, der ikke er standard (fx ægte italiensk marmor), så fortæl at du bruger en standard høj-pris for estimatet, men at den reelle pris afhænger af dagsprisen.

REGLER FOR ESTIMERING (VIGTIGT!):
For at undgå alt for lave priser, skal du (internt) tænke opgaven igennem i disse faser:
- Klargøring/Nedbrydning (fx bryde hul i murværk, understøttelse, bortskaffelse)
- Fundament/Konstruktion (fx støbe punktfundament, opsætte spær/strøer, indlægge overligger)
- Montering/Opbygning (selve primærarbejdet)
- Finish (Fuger, gerigter, afslutning, oprydning)

${questionsContext}

${dbContext}

UDOVER DATABASEN GÆLDER DISSE REGLER FOR SPECIALOPGAVER (TIDSBEREGNING):
- AI-modeller undervurderer typisk håndværksarbejde. Du skal være meget pessimistisk i dine tidsestimater!
- Opstart, logistik, opmåling og kørsel til trælast tager ALTID minimum 4-6 timer pr. opgave. Læg dette oveni.
- Oprydning, slutfinish og kvalitetssikring tager ALTID minimum 3-5 timer. Læg dette oveni.
- Formlerne fra databasen (fx hoursPerUnit) gælder KUN basis-montagen. DU SKAL ALTID GANGE ALLE RELEVANTE TILLÆG MED KVADRATMETERNE! Fx: Hvis kunden skal have gravet fundament (groundFoundationHours), skal du lægge (0.8t * kvadratmeter) oveni. Hvis der er skjulte skruer, læg (0.3t * kvadratmeter) oveni. DETTE ER KRITISK!
- Nyt hul i en ydervæg til dør/vindue: Minimum 15-20 arbejdstimer udover selve dørmonteringen.
- GANG ALTID DIT ENDELIGE TIMEESTIMAT (inkl. opstart, tillæg og oprydning) MED 1.30 (Tillæg 30% til uforudsete forhindringer og pauser).

NÅR DU ER KLAR TIL AT GIVE OVERSLAG:
Når - og KUN når - du med sikkerhed har afdækket opgaven fyldestgørende og fået svar på ALLE relevante punkter fra tjeklisterne for ALLE dele kunden har nævnt, SKAL DU BRUGE FUNKTIONEN \`submit_estimate\` til at aflevere dit gæt. Sig til kunden i en venlig besked, at du nu har information nok til at beregne et overslag, og at de blot skal trykke på knappen for at gå videre.`
            };

            const greeting = {
                role: 'assistant',
                content: `Hej! Jeg er AI-assistenten for ${carpenter?.owner_name?.split(' ')[0] || 'tømreren'} hos ${carpenter?.company_name || 'firmaet'}.\n\nMin opgave er at hjælpe dig med at spore dig ind på dit projekt, så jeg kan give dig et vejledende prisoverslag med det samme.\n\nHvad drømmer du om at få bygget eller fikset?`
            };

            setMessages([systemPrompt, greeting]);
        };

        if (messages.length === 0) {
            initChat();
        }
    }, [carpenter, settingsData, messages.length]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const apiResponse = await fetch('/api/chat-estimator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "submit_estimate",
                                description: "Når du har nok info, kald denne funktion for at give dit endelige overslag i arbejdstimer og materialeindkøb. KALD KUN DENNE NÅR DU ER HELT FÆRDIG MED AT SPØRGE.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        projectTitle: { type: "string", description: "En kort, præcis og beskrivende overskrift på projektet på max 2-4 ord (fx 'Nyt Tag og Vinduer', 'Skur og Hegn' eller 'Udskiftning af yderdør'). Skriv ALDRIG 'AI Opgave'." },
                                        laborHours: { type: "number", description: "Samlet estimeret arbejdstid i timer for hele opgaven. (Husk at summere timer for alle dele, inkl. uforudsete forhindringer)" },
                                        materialCost: { type: "number", description: "Samlet estimeret materialeindkøbspris i DKK for alle dele af opgaven." },
                                        breakdown: {
                                            type: "array",
                                            description: "En liste over de specifikke dele af opgaven, så tømreren kan se præcis, hvad du har medregnet (f.eks. '15m2 træterrasse', 'Udskiftning af yderdør', 'Hul i mur').",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    item: { type: "string", description: "Kort beskrivelse af delen (fx '15m2 trykimprægneret terrasse')" },
                                                    hours: { type: "number", description: "Timer afsat til denne del" },
                                                    materials: { type: "number", description: "Materialepris i DKK afsat til denne del" }
                                                },
                                                required: ["item", "hours", "materials"]
                                            }
                                        }
                                    },
                                    required: ["laborHours", "materialCost", "breakdown"]
                                }
                            }
                        }
                    ]
                })
            });

            const data = await apiResponse.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Fejl fra server');
            }

            const aiMsgObject = data.message;
            
            // Hvis AI'en kalder funktionen for at afgive estimat
            if (aiMsgObject.tool_calls && aiMsgObject.tool_calls.length > 0) {
                const toolCall = aiMsgObject.tool_calls[0];
                if (toolCall.function.name === 'submit_estimate') {
                    const args = JSON.parse(toolCall.function.arguments);
                    
                    // Lav en pæn afslutningsbesked til chatten
                    const finalAiMsg = {
                        role: 'assistant',
                        content: `Perfekt! Jeg har nu tænkt hele opgaven igennem og fået de detaljer med, jeg har brug for til at regne et vejledende overslag sammen.\n\nFor at ${carpenter?.owner_name?.split(' ')[0] || 'tømreren'} kan sikre sig, at vi ikke har overset noget, når han senere skal gennemgå opgaven, vil jeg dog rigtig gerne bede dig om at uploade et par billeder af området på næste side.\n\nKlik på knappen herunder for at gå videre og se dit overslag!`
                    };
                    
                    setMessages(prev => [...prev, finalAiMsg]);
                    
                    // I stedet for timeout gemmer vi data, og viser knappen
                    setEstimateData({ 
                        chatLog: [...messages, userMsg, finalAiMsg], 
                        isAiEstimate: true,
                        aiProjectTitle: args.projectTitle || 'Specialopgave',
                        aiLaborHours: args.laborHours,
                        aiMaterialCost: args.materialCost,
                        aiBreakdown: args.breakdown
                    });
                    
                    setIsLoading(false);
                    return; // Stop her, da vi er færdige
                }
            }

            // Normal chat respons hvis den ikke kalder et tool
            const aiText = aiMsgObject.content || "Jeg er ved at tænke...";
            const aiMsg = { role: 'assistant', content: aiText };
            setMessages(prev => [...prev, aiMsg]);
            
        } catch (error) {
            console.error("OpenAI Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Beklager, min hjerne slog lige en prut. Kan du gentage det?' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="wizard-step active" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '60vh', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                <img src={carpenter?.portrait_url || `https://ui-avatars.com/api/?name=${carpenter?.owner_name || 'Tømrer'}&background=0f172a&color=fff&size=50`} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Chat med {carpenter?.owner_name?.split(' ')[0] || 'Tømreren'}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>AI Tømrer Assistent</p>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.filter(m => m.role !== 'system').map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        {msg.role === 'assistant' && (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bot size={18} color="#475569" />
                            </div>
                        )}
                        <div style={{ background: msg.role === 'user' ? '#2563eb' : '#f8fafc', color: msg.role === 'user' ? '#fff' : '#1e293b', padding: '12px 16px', borderRadius: '12px', border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.content.replace(/\[KLAR_TIL_TILBUD.*?\]/i, '').trim()}
                        </div>
                        {msg.role === 'user' && (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <User size={18} color="#fff" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Loader2 size={18} color="#475569" className="animate-spin" />
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Loader2 size={16} color="#64748b" className="animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                {estimateData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0, textAlign: 'center' }}>
                            For at jeg kan vise dig det beregnede overslag, mangler vi blot dine kontaktoplysninger.
                        </p>
                        <button 
                            onClick={() => onComplete(estimateData)}
                            style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                padding: '16px 32px',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: '100%',
                                maxWidth: '400px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)'
                            }}
                        >
                            Gå til Prisoverslag <Send size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <textarea
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                    e.target.style.height = 'auto'; // Reset height after send
                                }
                            }}
                            placeholder="Beskriv opgaven eller svar tømreren her..."
                            disabled={isLoading}
                            rows={1}
                            style={{
                                flex: 1,
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem',
                                backgroundColor: isLoading ? '#f8fafc' : 'white',
                                outline: 'none',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                                resize: 'none',
                                overflowY: 'auto',
                                minHeight: '50px',
                                maxHeight: '150px',
                                fontFamily: 'inherit',
                                lineHeight: '1.4'
                            }}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            style={{
                                backgroundColor: isLoading || !input.trim() ? '#94a3b8' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                padding: '0 24px',
                                borderRadius: '8px',
                                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatEstimator;
