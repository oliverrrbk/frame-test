import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

const AiSupportWidget = ({ carpenter, currentStep, projectData, projects }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasNewMessageBadge, setHasNewMessageBadge] = useState(true);
    const messagesEndRef = useRef(null);

    // Filter tier: Kun tilgængelig for standard (professionel) og enterprise tiers
    // Moved to the bottom to avoid breaking Rules of Hooks

    const carpenterName = carpenter?.owner_name?.split(' ')[0] || 'Tømreren';
    const companyName = carpenter?.company_name || 'Tømrerfirmaet';

    // Generer præcise dynamiske hjælpespørgsmål baseret på trin og kategori
    const getSuggestions = () => {
        const category = projectData?.category || '';
        
        if (currentStep === 1) {
            return [
                'Hvad er et Kombi-projekt?',
                'Hvor meget mængderabat kan man få?',
                'Hvordan fungerer prisoverslaget?'
            ];
        }
        if (currentStep === 2) {
            switch (category) {
                case 'floor':
                    return [
                        'Hvad er forskellen på sildeben og plankegulv?',
                        'Hvornår skal man lægge nyt undergulv?',
                        'Hvad er fordelen ved strøer frem for svømmende?'
                    ];
                case 'roof':
                    return [
                        'Hvilken tagtype har den længste levetid?',
                        'Hvad betyder asbest-reglerne for mit tag?',
                        'Hvad koster tagrender i zink vs plast?'
                    ];
                case 'terrace':
                    return [
                        'Hvilket træ er bedst: Cedertræ, komposit eller trykimp?',
                        'Hvad betyder skjult skruemontering?',
                        'Hvornår kræves der punktfundament?'
                    ];
                case 'windows':
                case 'doors':
                    return [
                        'Skal jeg vælge Træ/Alu, Plast (PVC) eller rent træ?',
                        'Er 3-lags glas pengene værd frem for 2-lags?',
                        'Hvordan opmåler jeg bedst mine vinduer?'
                    ];
                case 'kitchen':
                    return [
                        'Hvad koster montering af et standard IKEA køkken?',
                        'Inkluderer jeres tilbud VVS- og el-tilslutning?',
                        'Hvor lang tid tager en komplet køkkenudskiftning?'
                    ];
                case 'bath':
                    return [
                        'Kræver mit nye badeværelse byggetilladelse?',
                        'Hvem koordinerer elektriker og VVS?',
                        'Kan jeg selv købe badeværelsesmøbler og fliser?'
                    ];
                default:
                    return [
                        'Hvilket materiale anbefaler I?',
                        'Hvor meget tid tager dette projekt typisk?',
                        'Hvad skal jeg være opmærksom på her?'
                    ];
            }
        }
        if (currentStep === 3) {
            return [
                'Hvorfor skal I bruge billeder?',
                'Hvilke billeder og vinkler hjælper mest?',
                'Hvad hvis jeg ikke har billeder af mit projekt?'
            ];
        }
        if (currentStep === 4) {
            return [
                'Hvad sker der efter jeg trykker send?',
                'Er overslaget uforpligtende?',
                'Hvor hurtigt kommer I på besigtigelse?'
            ];
        }
        return [
            'Hvad er jeres leveringstid?',
            'Hvilke garantier yder I (Byg Garanti)?',
            'Hvordan foregår betalingen?'
        ];
    };

    // Auto-scroll til nyeste besked
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setHasNewMessageBadge(false);
        }
    }, [messages, isOpen]);

    // Initialisér samtale med en velkomstbesked
    useEffect(() => {
        const welcomeText = `Hej! Vi er dit AI-byggerådgiver-team hos ${companyName}. 
Vi kan rådgive dig om materialer, fordele/ulemper og byggeteknikker på dette trin. 
(Bemærk: Vi kan give dig relative prissammenligninger, men præcise prisoverslag klarer vores beregner automatisk!)

Hvad kan vi hjælpe dig med i dag?`;
        
        setMessages([
            { role: 'assistant', content: welcomeText }
        ]);
    }, [carpenter]);

    const handleSendMessage = async (textToSend) => {
        const messageText = textToSend || input;
        if (!messageText.trim()) return;

        if (messageText.length > 1000) {
            toast.error('Beskeden er for lang (max 1000 tegn).');
            return;
        }

        const newUserMessage = { role: 'user', content: messageText };
        setMessages(prev => [...prev, newUserMessage]);
        if (!textToSend) setInput('');
        setIsLoading(true);

        try {
            // Konstruer kontekst-data
            const contextData = {
                activeStep: currentStep,
                category: projectData?.category || 'Kombi-projekt',
                answers: projectData?.details || {},
                carpenterInfo: {
                    id: carpenter?.id,
                    owner_name: carpenter?.owner_name,
                    company_name: carpenter?.company_name,
                    tier: carpenter?.tier
                }
            };

            const response = await fetch('/api/ai-support', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, newUserMessage],
                    contextData
                })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
            } else {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: data.error || 'Ups! Der opstod en fejl under kommunikationen. Prøv venligst igen.' 
                }]);
            }
        } catch (error) {
            console.error('Error fetching AI support advice:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Der er i øjeblikket ingen forbindelse til AI-byggerådgiveren. Tjek din internetforbindelse og prøv igen.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!carpenter || carpenter.tier === 'basis') {
        return null;
    }

    return createPortal(
        <div className={`ai-support-wrapper ${isOpen ? 'is-open' : ''}`} style={{ 
            position: 'fixed', 
            zIndex: 999999, // Ultra high z-index to make sure it floats on top of everything
            fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
            {/* Background overlay on mobile when open */}
            {isOpen && <div className="ai-support-overlay" onClick={() => setIsOpen(false)} />}
            
            {/* FLOATING CHAT BUTTON */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(15, 23, 42, 0.96)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '30px',
                        padding: '12px 24px',
                        cursor: 'pointer',
                        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        letterSpacing: '0.2px',
                        position: 'relative'
                    }}
                    className="ai-chat-btn"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                        e.currentTarget.style.boxShadow = '0 25px 45px -10px rgba(15, 23, 42, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
                    }}
                >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <img 
                            src={carpenter.portrait_url || `https://ui-avatars.com/api/?name=${carpenter.owner_name || 'AI'}&background=0f172a&color=fff&size=80`} 
                            alt={carpenterName}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }}
                        />
                        <span style={{
                            position: 'absolute',
                            bottom: '-1px',
                            right: '-1px',
                            width: '9px',
                            height: '9px',
                            background: '#10b981',
                            borderRadius: '50%',
                            border: '2px solid #0f172a'
                        }} />
                    </div>
                    <span className="ai-chat-text">Spørg byggerådgiveren</span>

                    {/* Blinking notification badge */}
                    {hasNewMessageBadge && (
                        <span style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px',
                            width: '10px',
                            height: '10px',
                            background: '#10b981',
                            borderRadius: '50%',
                            border: '2px solid #ffffff',
                            animation: 'pulse 1.8s infinite'
                        }} />
                    )}
                </button>
            )}

            {/* EXPANDED CHAT PANEL */}
            {isOpen && (
                <div className="ai-chat-window" style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(30px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(190%)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.15), 0 0 1px rgba(15, 23, 42, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* CHAT HEADER */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        padding: '18px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(15, 23, 42, 0.06)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <img 
                                    src={carpenter.portrait_url || `https://ui-avatars.com/api/?name=${carpenter.owner_name || 'AI'}&background=0f172a&color=fff&size=80`} 
                                    alt={carpenterName}
                                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #cbd5e1' }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    width: '11px',
                                    height: '11px',
                                    background: '#10b981',
                                    borderRadius: '50%',
                                    border: '2px solid #ffffff',
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                }} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ display: 'block', color: '#0f172a', fontWeight: '700', fontSize: '0.98rem', letterSpacing: '-0.2px', lineHeight: '1.2' }}>
                                    Byggerådgiveren
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                    Repræsenterer {companyName}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.05)',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.1)';
                                e.currentTarget.style.color = '#0f172a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
                                e.currentTarget.style.color = '#64748b';
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* MESSAGES VIEW */}
                    <div style={{
                        flex: 1,
                        padding: '24px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        background: 'rgba(250, 250, 249, 0.4)'
                    }}>
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <div style={{
                                    background: msg.role === 'user' ? '#1e293b' : '#ffffff',
                                    color: msg.role === 'user' ? '#ffffff' : '#334155',
                                    padding: '12px 18px',
                                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(15, 23, 42, 0.08)' : '0 4px 12px rgba(0,0,0,0.02)',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(15, 23, 42, 0.06)',
                                    whiteSpace: 'pre-wrap',
                                    textAlign: 'left'
                                }}>
                                    {msg.content}
                                </div>
                                <span style={{
                                    fontSize: '0.72rem',
                                    color: '#94a3b8',
                                    marginTop: '6px',
                                    fontWeight: '500',
                                    paddingLeft: msg.role === 'user' ? '0' : '6px',
                                    paddingRight: msg.role === 'user' ? '6px' : '0'
                                }}>
                                    {msg.role === 'user' ? 'Dig' : carpenterName}
                                </span>
                            </div>
                        ))}
                        
                        {/* LOADING INDICATOR */}
                        {isLoading && (
                            <div style={{ 
                                display: 'flex', 
                                gap: '6px', 
                                padding: '14px 20px', 
                                background: '#ffffff', 
                                borderRadius: '18px 18px 18px 4px', 
                                border: '1px solid rgba(15, 23, 42, 0.06)', 
                                alignSelf: 'flex-start', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)' 
                            }}>
                                <span className="typing-dot" style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0s' }}></span>
                                <span className="typing-dot" style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></span>
                                <span className="typing-dot" style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* SUGGESTED QUESTIONS (Clickable prompts) */}
                    <div style={{
                        padding: '14px 20px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left' }}>
                            Hurtige spørgsmål
                        </span>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }} className="no-scrollbar">
                            {getSuggestions().map((sug, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(sug)}
                                    disabled={isLoading}
                                    style={{
                                        background: '#ffffff',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '30px',
                                        padding: '8px 16px',
                                        fontSize: '0.78rem',
                                        whiteSpace: 'nowrap',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                        fontWeight: '500',
                                        flexShrink: 0
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.background = '#0f172a';
                                            e.currentTarget.style.color = '#ffffff';
                                            e.currentTarget.style.borderColor = '#0f172a';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.background = '#ffffff';
                                            e.currentTarget.style.color = '#475569';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* INPUT FORM */}
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                        }}
                        style={{
                            padding: '18px 24px',
                            background: '#ffffff',
                            borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center'
                        }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Skriv et spørgsmål..."
                            disabled={isLoading}
                            maxLength={1000}
                            style={{
                                flex: 1,
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'all 0.2s',
                                background: '#f1f5f9',
                                color: '#1e293b'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(15, 23, 42, 0.05)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            style={{
                                background: input.trim() && !isLoading ? '#0f172a' : '#cbd5e1',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                width: '42px',
                                height: '42px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            onMouseEnter={(e) => {
                                if (input.trim() && !isLoading) {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            {/* EMBEDDED KEYFRAME ANIMATIONS & STYLES */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(24px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                    }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                }

                .ai-support-wrapper {
                    bottom: 24px;
                    right: 24px;
                    pointer-events: none;
                }
                .ai-support-wrapper > * {
                    pointer-events: auto;
                }
                .ai-chat-window {
                    width: 390px;
                    height: 590px;
                    border-radius: 24px;
                }
                .ai-support-overlay {
                    display: none;
                }

                @media (max-width: 640px) {
                    .ai-support-wrapper {
                        bottom: 16px;
                        right: 16px;
                    }
                    .ai-support-wrapper.is-open {
                        bottom: 0;
                        right: 0;
                        width: 100%;
                        height: 100dvh;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end;
                    }
                    .ai-support-overlay {
                        display: block;
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(15, 23, 42, 0.4);
                        backdrop-filter: blur(4px);
                        -webkit-backdrop-filter: blur(4px);
                        z-index: 1;
                        animation: fadeIn 0.3s ease-out;
                    }
                    .ai-chat-window {
                        width: 100%;
                        height: 85dvh;
                        border-radius: 28px 28px 0 0 !important;
                        border: none !important;
                        box-shadow: 0 -10px 40px rgba(0,0,0,0.15) !important;
                        z-index: 2;
                        animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    }
                    
                    .ai-chat-btn {
                        padding: 12px 14px !important;
                        border-radius: 30px !important;
                        gap: 0 !important;
                    }
                    .ai-chat-text {
                        display: none !important;
                    }
                }
            `}} />
        </div>,
        document.body
    );
};

export default AiSupportWidget;
