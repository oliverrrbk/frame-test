import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

const CalculatorFaqAccordion = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{
            marginTop: '24px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isOpen ? '#f1f5f9' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        background: '#e0e7ff', 
                        color: '#4f46e5', 
                        padding: '8px', 
                        borderRadius: '8px' 
                    }}>
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                            Bag om beregneren: Sådan bruges dine indstillinger
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            Læs om hvordan algoritmen inddrager dine priser og beskytter din indtjening.
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
            </button>

            {isOpen && (
                <div style={{ padding: '0 24px 24px 24px' }}>
                    <div style={{ height: '1px', background: '#e2e8f0', margin: '0 0 24px 0' }} />
                    
                    <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr' }}>
                        
                        {/* Point 1 */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ marginTop: '2px', color: '#10b981' }}><ShieldCheck size={20} /></div>
                            <div>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>
                                    Materialer og vejledende priser
                                </h5>
                                <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                                    For at sikre en stabil prisberegning, tager systemet udgangspunkt i gennemsnitlige, 
                                    vejledende listepriser for materialer (svarende til priser i byggemarkeder som Stark og Bygma). 
                                    Da kunden faktureres ud fra listeprisen inklusiv din valgte avance, fungerer din eventuelle 
                                    B2B-erhvervsrabat reelt som en ekstra, indbygget margen i dit samlede dækningsbidrag.
                                </p>
                            </div>
                        </div>

                        {/* Point 2 */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ marginTop: '2px', color: '#3b82f6' }}><Zap size={20} /></div>
                            <div>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>
                                    Omfattende materialeberegning (Spild og følgematerialer)
                                </h5>
                                <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                                    Beregneren er sat op til at medregne alle nødvendige følgematerialer. Der tillægges automatisk 
                                    en spildprocent (typisk 10-15% til tilskæring), samt omkostninger til fuge, skruer, speciallim 
                                    og dampspærre-tape afhængigt af opgavetypen. Hvis kunden for eksempel vælger et specialmønster som sildebensparket, 
                                    registreres der automatisk øget tidsforbrug og udgifter til fuldlimning.
                                </p>
                            </div>
                        </div>

                        {/* Point 3 */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ marginTop: '2px', color: '#f59e0b' }}><AlertTriangle size={20} /></div>
                            <div>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>
                                    Intelligente tillæg (Markup Separation)
                                </h5>
                                <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                                    For at fastholde et konkurrencedygtigt niveau, tillægges din materialeavance ikke på 
                                    eksterne ydelser eller maskinleje. Hvis opgaven kræver brug af bomlift, facadestillads 
                                    eller medfører statslige miljøgebyrer, indregnes disse elementer til deres rene kostpris, 
                                    så tilbuddet ikke bliver uforholdsmæssigt dyrt for kunden.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default CalculatorFaqAccordion;
