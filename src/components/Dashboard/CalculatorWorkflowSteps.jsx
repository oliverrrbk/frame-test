import React, { useState } from 'react';
import { 
    ChevronDown, 
    ChevronUp, 
    MousePointerClick, 
    PackageOpen, 
    SlidersHorizontal, 
    ShieldCheck, 
    Send, 
    LifeBuoy,
    Info
} from 'lucide-react';

const CalculatorWorkflowSteps = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{
            marginTop: '24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
            {/* Header / Trigger */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isOpen ? 'var(--bg-hover)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: '#3b82f6', 
                        padding: '12px', 
                        borderRadius: '12px' 
                    }}>
                        <Info size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            Sådan beregnes dit unikke tilbud
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                            Forstå hvordan kundens input og dine priser bliver til et skræddersyet overslag.
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp size={24} color="var(--text-secondary)" /> : <ChevronDown size={24} color="var(--text-secondary)" />}
            </button>

            {/* Content Container */}
            {isOpen && (
                <div style={{ padding: '0 24px 32px 24px' }}>
                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '0 0 32px 0' }} />
                    
                    {/* The 4 Steps Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                        gap: '24px',
                        marginBottom: '40px'
                    }}>
                        {/* Step 1 */}
                        <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                                    <MousePointerClick size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Trin 1</span>
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>Kunden svarer på enkle spørgsmål</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Kunden besøger dit unikke link og klikker sig igennem få, letforståelige visuelle spørgsmål (fx "Nyt gulv, Sildeben, 50m2").
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
                                    <PackageOpen size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Trin 2</span>
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>Listepriser & Skjult Avance</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Systemet slår op i vejledende listepriser. Da kunden faktureres for listeprisen, fungerer din reelle B2B-erhvervsrabat i trælasterne som et skjult ekstra dækningsbidrag.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '10px' }}>
                                    <SlidersHorizontal size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Trin 3</span>
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>Det bliver DIT overslag</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Nu indregnes dine personlige indstillinger. Systemet anvender din timepris på tidsforbruget, udregner kørsel via Google Maps, og ganger din materialeavance oven i byggevarerne.
                            </p>
                        </div>

                        {/* Step 4 */}
                        <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '10px', borderRadius: '10px' }}>
                                    <ShieldCheck size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Trin 4</span>
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>Sikkerhed & Faldgruber</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Før kunden ser prisen, indregnes spildprocenter (fx +15% afskær), fuge, skruer og miljøgebyrer. Kunden ser et trygt overslag, og du modtager et kvalificeret lead i indbakken.
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions (CTA & Support) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* CTA Box */}
                        <div style={{ 
                            background: 'var(--bg-active)', 
                            border: '1px solid var(--border-light)', 
                            borderRadius: '12px', 
                            padding: '24px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{ marginTop: '2px', color: 'var(--text-primary)' }}><Send size={24} /></div>
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>Er du klar? Sådan kommer du i gang</h4>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    Kopier dit personlige overslagslink øverst på siden, og send det direkte til dine potentielle kunder på SMS eller mail, 
                                    eller læg det ind på din egen hjemmeside som en "Beregn Pris"-knap.
                                </p>
                            </div>
                        </div>

                        {/* Support Box */}
                        <div style={{ 
                            background: 'transparent', 
                            borderRadius: '12px', 
                            padding: '16px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{ marginTop: '2px', color: 'var(--text-tertiary)' }}><LifeBuoy size={20} /></div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    <strong>Brug for hjælp?</strong> Har du spørgsmål til beregneren, eller vil du have hjælp til at indstille 
                                    din avance helt præcist? Så kan du altid ringe til os eller skrive en mail – vi sidder klar til at 
                                    hjælpe din forretning godt i gang.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default CalculatorWorkflowSteps;
