import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { WORK_FORMULAS } from '../../prices';
import { QUESTIONS } from './questionsConfig';

const ChatEstimator = ({ carpenter, settingsData, materialsData, onComplete, prevStep }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [estimateData, setEstimateData] = useState(null); // Nyt state til at holde data indtil brugeren klikker
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null); // Håndter memory leaks ved unmount

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Cleanup function for at afbryde igangværende API kald hvis brugeren forlader komponenten
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // OPTIMERING: Byg database-konteksten én gang for at spare CPU pr. besked
    const { dbContext, questionsContext } = React.useMemo(() => {
        let db = '';
        if (materialsData) {
            db += '\nLIVE MATERIALEPRISER (Rent indkøb i DKK fra databasen):\n';
            Object.entries(materialsData).forEach(([cat, items]) => {
                db += `- ${cat.toUpperCase()}: ${Object.entries(items).map(([name, price]) => `${name}: ${price} kr`).join(', ')}\n`;
            });
        }
        db += '\nLIVE TIDSFORBRUG (Timer pr. enhed/m2 fra databasen):\n';
        Object.entries(WORK_FORMULAS).forEach(([cat, data]) => {
            db += `- ${cat.toUpperCase()}: ${Object.entries(data).filter(([k]) => k !== 'containerThreshold').map(([k, v]) => `${k}: ${v}t`).join(', ')}\n`;
        });
        let qs = '\nFAGSPECIFIKKE TJEKLISTER (VIGTIGT!):\nHvis kunden nævner et projekt, der falder inden for en af nedenstående kategorier (fx tag, vinduer, køkken), SKAL du bruge de tilhørende spørgsmål som din interne huskeliste. Du MÅ ALDRIG give et estimat, før du har fået afklaret disse specifikke spørgsmål (spørg ind løbende, max 1-2 ad gangen):\n';
        Object.entries(QUESTIONS).forEach(([cat, questionsArray]) => {
            qs += `\nKATEGORI: ${cat.toUpperCase()}\n`;
            questionsArray.forEach(q => {
                if (q.label) {
                    qs += `- ${q.label}`;
                    if (q.options && Array.isArray(q.options)) {
                        const optStrings = q.options.map(opt => typeof opt === 'string' ? opt : (opt.label || ''));
                        qs += ` (Muligheder: ${optStrings.filter(Boolean).join(', ')})`;
                    }
                    qs += `\n`;
                }
            });
        });
        return { dbContext: db, questionsContext: qs };
    }, [materialsData]);

    useEffect(() => {
        // Initialiser chat med System Prompt
        const initChat = async () => {
            const greeting = {
                role: 'assistant',
                content: `Hej! Jeg er den digitale assistent for ${carpenter?.owner_name?.split(' ')[0] || 'tømreren'} fra ${carpenter?.company_name || 'firmaet'}.\n\nMin opgave er at hjælpe dig i mål med dine byggedrømme. For at kunne give dig det bedste vejledende prisoverslag, vil jeg stille dig et par spørgsmål om opgaven. Hvis der er noget, du er i tvivl om undervejs, skal du endelig bare bede mig om at uddybe!\n\nHvad drømmer du om at få lavet?`
            };

            setMessages([greeting]);
        };

        if (messages.length === 0) {
            initChat();
        }
    }, [carpenter, settingsData, messages.length]);

    const handleSend = async () => {
        const cleanInput = input.trim().slice(0, 1000); // Sikkerhedsgrænse
        if (!cleanInput) return;

        const userMsg = { role: 'user', content: cleanInput };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Mekanisk textarea reset
        const ta = document.getElementById('chat-textarea');
        if (ta) ta.style.height = 'auto';

        try {
            abortControllerRef.current = new AbortController();


            const apiResponse = await fetch('/api/chat-estimator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    // Filtrer UI-fejlbeskeder fra, så AI'en ikke forurenes af kontekst den ikke forstår
                    messages: [...messages.filter(m => !m.isError), userMsg],
                    contextData: {
                        dbContext,
                        questionsContext,
                        carpenterInfo: carpenter
                    }
                })
            });

            let data;
            const contentType = apiResponse.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await apiResponse.json();
            } else {
                const text = await apiResponse.text();
                throw new Error("Serveren returnerede ikke JSON (dette sker ofte ved lokal test uden Vercel CLI).");
            }
            
            if (!data.success) {
                throw new Error(data.error || 'Fejl fra server');
            }

            const aiMsgObject = data.message;
            
            // Hvis AI'en kalder funktionen for at afgive estimat
            if (aiMsgObject.tool_calls && aiMsgObject.tool_calls.length > 0) {
                const toolCall = aiMsgObject.tool_calls[0];
                if (toolCall.function.name === 'submit_estimate') {
                    let args;
                    try {
                        args = JSON.parse(toolCall.function.arguments);
                    } catch (parseError) {
                        console.error("JSON parse fejl i estimat:", parseError);
                        // Kør blidt videre med en intern besked i stedet for hvid skærm
                        setMessages(prev => [...prev, { role: 'assistant', content: 'Min lommeregner snublede lige! Lad mig tænke over det igen...', isError: true }]);
                        setIsLoading(false);
                        return;
                    }
                    
                    const isComplex = Math.max(0, Number(args.laborHours) || 0) === 0 && Math.max(0, Number(args.materialCost) || 0) === 0;
                    
                    let finalMsgContent = `Sådan! Jeg har nu alle de detaljer, jeg skal bruge, for at kunne regne det ud for dig.\n\nFor at vi er helt sikre på, at vi taler om det samme, mangler vi blot et par billeder af området.\n\nTryk på knappen herunder, når du er klar til at se dit vejledende overslag! 👇`;
                    
                    if (isComplex) {
                        finalMsgContent = `Tak for snakken! 🛠️\n\nDu har beskrevet et spændende, men komplekst projekt. For at kunne give dig en retvisende og tryg pris på dette, kræver det, at vi kommer ud og besigtiger opgaven fysisk først.\n\nTryk på knappen herunder for at sende dine oplysninger, så kontakter vi dig for at aftale et møde! 👇`;
                    }

                    const finalAiMsg = {
                        role: 'assistant',
                        content: finalMsgContent
                    };
                    
                    setMessages(prev => [...prev, finalAiMsg]);
                    
                    // I stedet for timeout gemmer vi data, og viser knappen. DATA SANITERES for negative tal/NaN!
                    setEstimateData({ 
                        chatLog: [...messages, userMsg, finalAiMsg], 
                        isAiEstimate: true,
                        aiProjectTitle: args.projectTitle || 'Specialopgave',
                        aiLaborHours: Math.max(0, Number(args.laborHours) || 0),
                        aiMaterialCost: Math.max(0, Number(args.materialCost) || 0),
                        aiBreakdown: args.breakdown,
                        summaryBullets: args.summaryBullets || [],
                        obsNotes: args.obsNotes || "Ingen særlige forbehold"
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
            if (error.name === 'AbortError') {
                console.log('Forespørgsel blev afbrudt af brugeren.');
                return; // Stop uden at vise fejl
            }
            console.error("OpenAI Error:", error);
            
            // Hvis det fejler, fjern brugerens besked fra skærmen, og sæt teksten tilbage i tekstfeltet (RECOVERY)
            setMessages(prev => prev.filter(msg => msg !== userMsg));
            setInput(cleanInput);
            
            // Tilføj en midlertidig UI fejl-besked med isError: true
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Beklager, forbindelsen fejlede. Jeg har lagt din besked tilbage i skrivefeltet, så du kan prøve at sende den igen.', 
                isError: true 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>
                {`
                @keyframes typingBounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-4px); }
                }
                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background-color: #64748b;
                    border-radius: 50%;
                    animation: typingBounce 1.4s infinite ease-in-out both;
                }
                .typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .typing-dot:nth-child(2) { animation-delay: -0.16s; }
                .typing-dot:nth-child(3) { animation-delay: 0s; }
                `}
            </style>
            <div className="wizard-step active" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '400px', maxHeight: '75vh', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={carpenter?.portrait_url || `https://ui-avatars.com/api/?name=${carpenter?.owner_name || 'Tømrer'}&background=0f172a&color=fff&size=50`} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Chat med {carpenter?.owner_name?.split(' ')[0] || 'Tømreren'}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Digital Assistent</p>
                    </div>
                </div>
                {prevStep && (
                    <button 
                        onClick={prevStep} 
                        style={{ 
                            background: 'transparent', 
                            border: '1px solid #cbd5e1', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            color: '#475569', 
                            fontSize: '14px', 
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        ← Tilbage
                    </button>
                )}
            </div>

            <div role="log" aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.filter(m => m.role !== 'system').map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        {msg.role === 'assistant' && (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bot size={18} color="#475569" />
                            </div>
                        )}
                        <div style={{ background: msg.role === 'user' ? '#2563eb' : (msg.isError ? '#fee2e2' : '#f8fafc'), color: msg.role === 'user' ? '#fff' : (msg.isError ? '#b91c1c' : '#1e293b'), padding: '12px 16px', borderRadius: '12px', border: msg.role === 'user' ? 'none' : (msg.isError ? '1px solid #fca5a5' : '1px solid #e2e8f0'), fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.content.replace(/\[KLAR_TIL_TILBUD.*?\]/i, '').replace(/[*#]/g, '').trim()}
                        </div>
                        {msg.role === 'user' && (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <User size={18} color="#fff" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', maxWidth: '85%' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bot size={18} color="#475569" />
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', height: '45px' }}>
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                {estimateData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0, textAlign: 'center' }}>
                            {estimateData.aiLaborHours === 0 && estimateData.aiMaterialCost === 0 
                                ? "Vi mangler blot dine kontaktoplysninger for at kunne arrangere en besigtigelse."
                                : "For at jeg kan vise dig det beregnede overslag, mangler vi blot dine kontaktoplysninger."}
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
                            {estimateData.aiLaborHours === 0 && estimateData.aiMaterialCost === 0 
                                ? "Anmod om besigtigelse"
                                : "Gå til Prisoverslag"} <Send size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <textarea
                            id="chat-textarea"
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
                            onFocus={scrollToBottom}
                            placeholder="Beskriv opgaven eller svar tømreren her..."
                            disabled={isLoading}
                            maxLength={1000}
                            rows={1}
                            style={{
                                flex: 1,
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '16px',
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
                                padding: '0 16px',
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
        </>
    );
};

export default ChatEstimator;
